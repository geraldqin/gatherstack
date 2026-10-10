import { t } from "~shared/i18n"

export function getUnnamedSkillName(): string {
  return t("skillUnnamed")
}

export function getDefaultNewSkillName(): string {
  return t("skillDefaultNewName")
}

export const MAX_SKILL_MARKDOWN_BYTES = 512 * 1024

export type SkillFrontmatter = {
  name: string
  description?: string
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/

export function parseSkillFrontmatter(markdown: string): SkillFrontmatter {
  const match = markdown.match(FRONTMATTER_RE)
  if (!match) {
    return { name: getUnnamedSkillName() }
  }
  const block = match[1] ?? ""
  let name: string | undefined
  let description: string | undefined
  for (const line of block.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf(":")
    if (idx <= 0) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    if (key === "name" && value) name = value
    if (key === "description" && value) description = value
  }
  return {
    name: name || getUnnamedSkillName(),
    ...(description ? { description } : {})
  }
}

/** Markdown body without YAML frontmatter, for model system prompts. */
export function skillBodyFromMarkdown(markdown: string): string {
  const match = markdown.match(FRONTMATTER_RE)
  if (!match) {
    return markdown.trim()
  }
  return markdown.slice(match[0].length).trim()
}

export function buildDefaultSkillMarkdown(name?: string): string {
  const resolved = name ?? getDefaultNewSkillName()
  return `---
name: ${resolved}
description:
---

`
}

/** Replace or insert frontmatter `name` while keeping the rest of the file. */
export function withSkillFrontmatterName(
  markdown: string,
  name: string
): string {
  const match = markdown.match(FRONTMATTER_RE)
  if (!match) {
    return `---\nname: ${name}\ndescription:\n---\n\n${markdown}`
  }
  const block = match[1] ?? ""
  const lines = block.split(/\r?\n/)
  let replaced = false
  const nextLines = lines.map((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) return line
    const idx = trimmed.indexOf(":")
    if (idx <= 0) return line
    const key = trimmed.slice(0, idx).trim()
    if (key !== "name") return line
    replaced = true
    const indent = line.match(/^\s*/)?.[0] ?? ""
    return `${indent}name: ${name}`
  })
  if (!replaced) {
    nextLines.unshift(`name: ${name}`)
  }
  const fence = match[0].endsWith("\n") ? match[0] : `${match[0]}\n`
  const body = markdown.slice(fence.length)
  return `---\n${nextLines.join("\n")}\n---\n${body}`
}

export function sanitizeSkillFilename(raw: string): string {
  const base = raw.replace(/\\/g, "/").split("/").pop()?.trim() ?? ""
  const cleaned = base.replace(/[<>:"|?*\u0000-\u001f]/g, "").trim()
  if (!cleaned) return "skill.md"
  if (cleaned.toLowerCase().endsWith(".md")) return cleaned
  const stem = cleaned.replace(/\.[^./\\]+$/, "") || cleaned
  return `${stem}.md`
}
