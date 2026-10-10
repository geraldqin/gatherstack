import { t } from "~shared/i18n"

import type { BuiltinSendModeId, SendModeDocument } from "../types"

export type SendModePresetCatalogEntry = {
  builtinId: BuiltinSendModeId
  version: string
  name: string
  description: string
  callModel: boolean
  autoSave: boolean
  includeHistory: boolean
  async: boolean
  maxConcurrent?: number
}

const VERSION = "1.0.0"

/**
 * Bundled send-mode presets. Names/descriptions resolved at seed time via i18n.
 */
export function loadSendModePresetCatalog(): SendModePresetCatalogEntry[] {
  return [
    {
      builtinId: "chat",
      version: VERSION,
      name: t("sendModeChatLabel"),
      description: t("sendModeChatDescription"),
      callModel: true,
      autoSave: false,
      includeHistory: true,
      async: false
    },
    {
      builtinId: "directStore",
      version: VERSION,
      name: t("sendModeDirectStoreLabel"),
      description: t("sendModeDirectStoreDescription"),
      callModel: false,
      autoSave: true,
      includeHistory: false,
      async: false
    },
    {
      builtinId: "asyncParse",
      version: VERSION,
      name: t("sendModeAsyncParseLabel"),
      description: t("sendModeAsyncParseDescription"),
      callModel: true,
      autoSave: false,
      includeHistory: false,
      async: true,
      maxConcurrent: 5
    },
    {
      builtinId: "oneClickCollect",
      version: VERSION,
      name: t("sendModeOneClickCollectLabel"),
      description: t("sendModeOneClickCollectDescription"),
      callModel: true,
      autoSave: true,
      includeHistory: false,
      async: false
    }
  ]
}

export function catalogEntryToPartial(
  entry: SendModePresetCatalogEntry
): Omit<SendModeDocument, "id" | "createdAt" | "updatedAt" | "origin"> {
  return {
    name: entry.name,
    description: entry.description,
    builtinId: entry.builtinId,
    version: entry.version,
    callModel: entry.callModel,
    autoSave: entry.autoSave,
    includeHistory: entry.includeHistory,
    async: entry.async,
    ...(entry.async
      ? { maxConcurrent: entry.maxConcurrent ?? 5 }
      : {})
  }
}
