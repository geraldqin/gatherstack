import type { SendModeDocument } from "../types"
import type { SendModesRepository } from "../repository"
import {
  catalogEntryToPartial,
  type SendModePresetCatalogEntry
} from "./catalog"

export type SeedPresetSendModesInput = {
  entries: SendModePresetCatalogEntry[]
  suppressedBuiltinIds: string[]
  repo: SendModesRepository
  now?: () => number
  createId?: () => string
}

export type SeedPresetSendModesResult = {
  inserted: number
  updated: number
  skipped: number
}

function buildBuiltinDoc(args: {
  id: string
  entry: SendModePresetCatalogEntry
  now: number
  createdAt?: number
}): SendModeDocument {
  const partial = catalogEntryToPartial(args.entry)
  return {
    id: args.id,
    createdAt: args.createdAt ?? args.now,
    updatedAt: args.now,
    origin: "builtin",
    ...partial
  }
}

function sameBuiltinContent(
  keep: SendModeDocument,
  entry: SendModePresetCatalogEntry
): boolean {
  const partial = catalogEntryToPartial(entry)
  return (
    keep.version === entry.version &&
    keep.name === partial.name &&
    keep.description === partial.description &&
    keep.callModel === partial.callModel &&
    keep.autoSave === partial.autoSave &&
    keep.includeHistory === partial.includeHistory &&
    keep.async === partial.async &&
    (keep.maxConcurrent ?? undefined) === (partial.maxConcurrent ?? undefined)
  )
}

/**
 * Idempotent seed / upgrade for bundled send modes.
 */
export async function seedPresetSendModes(
  input: SeedPresetSendModesInput
): Promise<SeedPresetSendModesResult> {
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
        entry,
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

    if (sameBuiltinContent(keep, entry)) {
      skipped += 1
      continue
    }

    const next = buildBuiltinDoc({
      id: keep.id,
      entry,
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
