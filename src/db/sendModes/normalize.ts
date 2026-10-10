import type { SendModeDocument, SendModeFlags, SendModeOrigin } from "./types"

export const DEFAULT_MAX_CONCURRENT = 5
export const MIN_MAX_CONCURRENT = 1
export const MAX_MAX_CONCURRENT = 20

export function clampMaxConcurrent(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN
  if (!Number.isFinite(n)) {
    return DEFAULT_MAX_CONCURRENT
  }
  const rounded = Math.round(n)
  if (rounded < MIN_MAX_CONCURRENT) {
    return MIN_MAX_CONCURRENT
  }
  if (rounded > MAX_MAX_CONCURRENT) {
    return MAX_MAX_CONCURRENT
  }
  return rounded
}

export function normalizeSendModeFlags(input: SendModeFlags): SendModeFlags {
  let callModel = Boolean(input.callModel)
  let autoSave = Boolean(input.autoSave)
  let includeHistory = Boolean(input.includeHistory)
  let async = Boolean(input.async)
  let maxConcurrent = input.maxConcurrent

  if (!callModel) {
    includeHistory = false
    async = false
    autoSave = true
    maxConcurrent = undefined
  } else if (async) {
    includeHistory = false
    maxConcurrent = clampMaxConcurrent(maxConcurrent)
  } else {
    maxConcurrent = undefined
  }

  const out: SendModeFlags = {
    callModel,
    autoSave,
    includeHistory,
    async
  }
  if (async) {
    out.maxConcurrent = maxConcurrent ?? DEFAULT_MAX_CONCURRENT
  }
  return out
}

function asOrigin(value: unknown): SendModeOrigin {
  return value === "builtin" ? "builtin" : "user"
}

export function normalizeSendModeDocument(raw: unknown): SendModeDocument {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >
  const flags = normalizeSendModeFlags({
    callModel: Boolean(row.callModel),
    autoSave: Boolean(row.autoSave),
    includeHistory: Boolean(row.includeHistory),
    async: Boolean(row.async),
    maxConcurrent:
      typeof row.maxConcurrent === "number" ? row.maxConcurrent : undefined
  })
  const id = typeof row.id === "string" ? row.id : ""
  const name = typeof row.name === "string" ? row.name : ""
  const description = typeof row.description === "string" ? row.description : ""
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

  const doc: SendModeDocument = {
    id,
    name,
    description,
    createdAt,
    updatedAt,
    origin,
    ...flags
  }
  if (builtinId) doc.builtinId = builtinId
  if (version) doc.version = version
  return doc
}
