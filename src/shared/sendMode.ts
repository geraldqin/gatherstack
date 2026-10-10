import type { SendModeDocument } from "~db/sendModes/types"
import { t } from "~shared/i18n"

import {
  DEFAULT_SEND_MODE_ID,
  resolveSendModeDocument,
  sendModePersistId,
  sortSendModeDocuments
} from "./sendModeResolve"

export type SendModeId = string

export const DEFAULT_SEND_MODE: SendModeId = DEFAULT_SEND_MODE_ID

export type SendModeOption = {
  id: SendModeId
  label: string
  description: string
  builtinId?: string
  callModel: boolean
  autoSave: boolean
  includeHistory: boolean
  async: boolean
  maxConcurrent?: number
}

export type SendModeColorKey =
  | "chat"
  | "directStore"
  | "asyncParse"
  | "oneClickCollect"
  | "custom"

export function sendModeColorKey(doc: {
  builtinId?: string
  callModel: boolean
  async: boolean
}): SendModeColorKey {
  if (
    doc.builtinId === "directStore" ||
    doc.builtinId === "asyncParse" ||
    doc.builtinId === "chat" ||
    doc.builtinId === "oneClickCollect"
  ) {
    return doc.builtinId
  }
  if (!doc.callModel) return "directStore"
  if (doc.async) return "asyncParse"
  return "custom"
}

/** 与设置页发送方式列表一致的 flags 摘要（模型 · 异步 · 自动存/手动存 · 历史） */
export function sendModeFlagsSummary(doc: {
  callModel: boolean
  autoSave: boolean
  includeHistory: boolean
  async: boolean
}): string {
  const parts: string[] = []
  if (doc.callModel) parts.push(t("sendModeFlagModel"))
  else parts.push(t("sendModeFlagNoModel"))
  if (doc.async) parts.push(t("sendModeFlagAsync"))
  if (doc.autoSave) parts.push(t("sendModeFlagAutoSave"))
  else parts.push(t("sendModeFlagManualSave"))
  if (doc.callModel && doc.includeHistory) parts.push(t("sendModeFlagHistory"))
  return parts.join(" · ")
}

export function sendModeDocumentsToOptions(
  modes: SendModeDocument[]
): SendModeOption[] {
  return sortSendModeDocuments(modes).map((doc) => ({
    id: sendModePersistId(doc),
    label: doc.name,
    description: sendModeFlagsSummary(doc),
    ...(doc.builtinId ? { builtinId: doc.builtinId } : {}),
    callModel: doc.callModel,
    autoSave: doc.autoSave,
    includeHistory: doc.includeHistory,
    async: doc.async,
    ...(doc.async && doc.maxConcurrent != null
      ? { maxConcurrent: doc.maxConcurrent }
      : {})
  }))
}

/** @deprecated Prefer resolve from DB list; kept for tests / legacy short names. */
export function getSendModeOptions(): SendModeOption[] {
  return [
    {
      id: "chat",
      label: t("sendModeChatLabel"),
      description: sendModeFlagsSummary({
        callModel: true,
        autoSave: false,
        includeHistory: true,
        async: false
      }),
      builtinId: "chat",
      callModel: true,
      autoSave: false,
      includeHistory: true,
      async: false
    },
    {
      id: "directStore",
      label: t("sendModeDirectStoreLabel"),
      description: sendModeFlagsSummary({
        callModel: false,
        autoSave: true,
        includeHistory: false,
        async: false
      }),
      builtinId: "directStore",
      callModel: false,
      autoSave: true,
      includeHistory: false,
      async: false
    },
    {
      id: "asyncParse",
      label: t("sendModeAsyncParseLabel"),
      description: sendModeFlagsSummary({
        callModel: true,
        autoSave: false,
        includeHistory: false,
        async: true
      }),
      builtinId: "asyncParse",
      callModel: true,
      autoSave: false,
      includeHistory: false,
      async: true,
      maxConcurrent: 5
    },
    {
      id: "oneClickCollect",
      label: t("sendModeOneClickCollectLabel"),
      description: sendModeFlagsSummary({
        callModel: true,
        autoSave: true,
        includeHistory: false,
        async: false
      }),
      builtinId: "oneClickCollect",
      callModel: true,
      autoSave: true,
      includeHistory: false,
      async: false
    }
  ]
}

export function normalizeSendMode(value: unknown): SendModeId {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }
  return DEFAULT_SEND_MODE
}

export function sendModeLabel(
  mode: SendModeId,
  options?: SendModeOption[]
): string {
  const list = options ?? getSendModeOptions()
  return list.find((item) => item.id === mode)?.label ?? t("sendModeChatLabel")
}

export function resolveOption(
  mode: SendModeId,
  options: SendModeOption[]
): SendModeOption {
  const found = options.find((item) => item.id === mode)
  if (found) return found
  const chat = options.find((item) => item.id === "chat" || item.builtinId === "chat")
  if (chat) return chat
  return (
    getSendModeOptions()[0] ?? {
      id: "chat",
      label: t("sendModeChatLabel"),
      description: sendModeFlagsSummary({
        callModel: true,
        autoSave: false,
        includeHistory: true,
        async: false
      }),
      builtinId: "chat",
      callModel: true,
      autoSave: false,
      includeHistory: true,
      async: false
    }
  )
}

export function colorKeyForModeId(
  mode: SendModeId,
  options: SendModeOption[]
): SendModeColorKey {
  const opt = resolveOption(mode, options)
  return sendModeColorKey(opt)
}

/** 主发送按钮：按模式区分底色 */
export function sendModePrimaryButtonClass(colorKey: SendModeColorKey): string {
  switch (colorKey) {
    case "directStore":
      return "bg-emerald-600 text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
    case "asyncParse":
      return "bg-violet-600 text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-300"
    case "oneClickCollect":
      return "bg-amber-600 text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-slate-300"
    default:
      return "bg-slate-800 text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
  }
}

/** 发送方式图标按钮：当前模式着色 */
export function sendModePickerTriggerClass(colorKey: SendModeColorKey): string {
  switch (colorKey) {
    case "directStore":
      return "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-slate-400"
    case "asyncParse":
      return "bg-violet-50 text-violet-700 hover:bg-violet-100 hover:text-violet-800 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-slate-400"
    case "oneClickCollect":
      return "bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-slate-400"
    default:
      return "text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400"
  }
}

/** 菜单项选中态：左侧色条 + 浅底 */
export function sendModeMenuOptionClass(
  colorKey: SendModeColorKey,
  selected: boolean
): string {
  if (!selected) {
    return "hover:bg-slate-100"
  }
  switch (colorKey) {
    case "directStore":
      return "bg-emerald-50 hover:bg-emerald-50"
    case "asyncParse":
      return "bg-violet-50 hover:bg-violet-50"
    case "oneClickCollect":
      return "bg-amber-50 hover:bg-amber-50"
    default:
      return "bg-slate-100 hover:bg-slate-100"
  }
}

export function sendModeMenuAccentClass(colorKey: SendModeColorKey): string {
  switch (colorKey) {
    case "directStore":
      return "text-emerald-700"
    case "asyncParse":
      return "text-violet-700"
    case "oneClickCollect":
      return "text-amber-700"
    default:
      return "text-slate-800"
  }
}

export {
  resolveSendModeDocument,
  sendModePersistId,
  sortSendModeDocuments,
  findSendModeDocument
} from "./sendModeResolve"
