import type { SendModeDocument } from "~db/sendModes/types"
import { normalizeSendModeDocument } from "~db/sendModes/normalize"

export const DEFAULT_SEND_MODE_ID = "chat"

export function findSendModeDocument(
  modes: SendModeDocument[],
  sendModeId: unknown
): SendModeDocument | undefined {
  if (typeof sendModeId !== "string" || !sendModeId) {
    return undefined
  }
  const byId = modes.find((m) => m.id === sendModeId)
  if (byId) {
    return byId
  }
  return modes.find(
    (m) => m.origin === "builtin" && m.builtinId === sendModeId
  )
}

export function resolveSendModeDocument(
  modes: SendModeDocument[],
  sendModeId: unknown
): SendModeDocument {
  const found = findSendModeDocument(modes, sendModeId)
  if (found) {
    return normalizeSendModeDocument(found)
  }
  const chat =
    modes.find((m) => m.origin === "builtin" && m.builtinId === "chat") ??
    modes.find((m) => m.builtinId === "chat")
  if (chat) {
    return normalizeSendModeDocument(chat)
  }
  // Fallback synthetic chat if seed has not run / all suppressed
  return normalizeSendModeDocument({
    id: DEFAULT_SEND_MODE_ID,
    name: "chat",
    description: "",
    createdAt: 0,
    updatedAt: 0,
    origin: "builtin",
    builtinId: "chat",
    version: "0",
    callModel: true,
    autoSave: false,
    includeHistory: true,
    async: false
  })
}

/** Persist value: prefer builtinId short name for builtins, else document id. */
export function sendModePersistId(doc: SendModeDocument): string {
  if (doc.origin === "builtin" && doc.builtinId) {
    return doc.builtinId
  }
  return doc.id
}

const BUILTIN_ORDER = [
  "chat",
  "directStore",
  "asyncParse",
  "oneClickCollect"
]

function builtinOrderIndex(doc: SendModeDocument): number {
  const i = doc.builtinId ? BUILTIN_ORDER.indexOf(doc.builtinId) : -1
  return i < 0 ? 99 : i
}

/** User copies/custom first by createdAt desc; builtins follow in seed order. */
export function sortSendModeDocuments(
  modes: SendModeDocument[]
): SendModeDocument[] {
  return [...modes].sort((a, b) => {
    const aUser = a.origin === "user"
    const bUser = b.origin === "user"
    if (aUser && bUser) {
      if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt
      return a.id.localeCompare(b.id)
    }
    if (aUser) return -1
    if (bUser) return 1
    return builtinOrderIndex(a) - builtinOrderIndex(b)
  })
}
