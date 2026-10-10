import {
  parseSkillFrontmatter,
  sanitizeSkillFilename
} from "../markdown"
import type { SkillDocument } from "../types"
import type { SkillsRepository } from "../repository"

export type PresetCatalogEntry = {
  builtinId: string
  version: string
  markdown: string
}

export type SeedPresetSkillsInput = {
  entries: PresetCatalogEntry[]
  suppressedBuiltinIds: string[]
  repo: SkillsRepository
  now?: () => number
  createId?: () => string
}

export type SeedPresetSkillsResult = {
  inserted: number
  updated: number
  skipped: number
}

function buildBuiltinDoc(args: {
  id: string
  builtinId: string
  version: string
  markdown: string
  now: number
  createdAt?: number
}): SkillDocument {
  const { name } = parseSkillFrontmatter(args.markdown)
  return {
    id: args.id,
    name,
    filename: sanitizeSkillFilename(`${name}.md`),
    markdown: args.markdown,
    createdAt: args.createdAt ?? args.now,
    updatedAt: args.now,
    origin: "builtin",
    builtinId: args.builtinId,
    version: args.version
  }
}

/**
 * Idempotent seed / upgrade for bundled preset skills.
 * Built-ins are product-owned: one row per builtinId (unless suppressed),
 * always overwritten in place on version/content change.
 */
export async function seedPresetSkills(
  input: SeedPresetSkillsInput
): Promise<SeedPresetSkillsResult> {
  const nowFn = input.now ?? Date.now
  const createId = input.createId ?? (() => crypto.randomUUID())
  const suppressed = new Set(input.suppressedBuiltinIds)
  let inserted = 0
  let updated = 0
  let skipped = 0

  const all = await input.repo.list()

  for (const entry of input.entries) {
    if (suppressed.has(entry.builtinId)) {
      skipped += 1
      continue
    }

    const matches = all.filter(
      (s) => s.origin === "builtin" && s.builtinId === entry.builtinId
    )

    if (matches.length === 0) {
      const doc = buildBuiltinDoc({
        id: createId(),
        builtinId: entry.builtinId,
        version: entry.version,
        markdown: entry.markdown,
        now: nowFn()
      })
      await input.repo.upsert(doc)
      all.push(doc)
      inserted += 1
      continue
    }

    matches.sort((a, b) => b.updatedAt - a.updatedAt)
    const keep = matches[0]!
    for (const extra of matches.slice(1)) {
      await input.repo.deleteById(extra.id)
      const idx = all.findIndex((s) => s.id === extra.id)
      if (idx >= 0) all.splice(idx, 1)
    }

    if (keep.version === entry.version && keep.markdown === entry.markdown) {
      skipped += 1
      continue
    }

    const next = buildBuiltinDoc({
      id: keep.id,
      builtinId: entry.builtinId,
      version: entry.version,
      markdown: entry.markdown,
      now: nowFn(),
      createdAt: keep.createdAt
    })
    await input.repo.upsert(next)
    const idx = all.findIndex((s) => s.id === keep.id)
    if (idx >= 0) all[idx] = next
    updated += 1
  }

  return { inserted, updated, skipped }
}
