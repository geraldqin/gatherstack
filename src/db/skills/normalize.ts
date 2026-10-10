import type { SkillDocument, SkillOrigin } from "./types"

function asOrigin(value: unknown): SkillOrigin {
  return value === "builtin" ? "builtin" : "user"
}

/**
 * Normalize raw IndexedDB rows (including pre-v4 docs missing new fields).
 */
export function normalizeSkillDocument(raw: unknown): SkillDocument {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >
  const id = typeof row.id === "string" ? row.id : ""
  const name = typeof row.name === "string" ? row.name : ""
  const filename = typeof row.filename === "string" ? row.filename : ""
  const markdown = typeof row.markdown === "string" ? row.markdown : ""
  const createdAt = typeof row.createdAt === "number" ? row.createdAt : 0
  const updatedAt = typeof row.updatedAt === "number" ? row.updatedAt : 0
  const origin = asOrigin(row.origin)
  const builtinId =
    typeof row.builtinId === "string" && row.builtinId.trim()
      ? row.builtinId
      : undefined
  const version =
    typeof row.version === "string" && row.version.trim()
      ? row.version
      : undefined

  const doc: SkillDocument = {
    id,
    name,
    filename,
    markdown,
    createdAt,
    updatedAt,
    origin
  }
  if (builtinId) doc.builtinId = builtinId
  if (version) doc.version = version
  return doc
}
