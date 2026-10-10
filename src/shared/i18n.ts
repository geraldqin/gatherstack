import en from "../../locales/en/messages.json"
import zhCN from "../../locales/zh_CN/messages.json"
import zhHK from "../../locales/zh_HK/messages.json"
import zhTW from "../../locales/zh_TW/messages.json"

type MessageEntry = {
  message: string
  placeholders?: Record<string, { content: string }>
}

type MessageCatalog = Record<string, MessageEntry>

// Do not use Plasmo `data-text:` for *.json — Parcel emits a JS module
// string, JSON.parse throws at load, and the side panel stays blank.
const CATALOGS: Record<string, MessageCatalog> = {
  en: en as MessageCatalog,
  zh_CN: zhCN as MessageCatalog,
  zh_TW: zhTW as MessageCatalog,
  zh_HK: zhHK as MessageCatalog
}

function normalizeSubstitutions(
  substitutions?: string | string[]
): string[] {
  if (substitutions == null) {
    return []
  }
  return Array.isArray(substitutions) ? substitutions : [substitutions]
}

function formatEntry(
  entry: MessageEntry,
  substitutions?: string | string[]
): string {
  let msg = entry.message
  const subs = normalizeSubstitutions(substitutions)
  if (!entry.placeholders || subs.length === 0) {
    return msg
  }
  for (const [name, meta] of Object.entries(entry.placeholders)) {
    const index = Number(String(meta.content).replace("$", "")) - 1
    const value = subs[index]
    if (value != null) {
      msg = msg.split(`$${name}$`).join(value)
    }
  }
  return msg
}

/** Map chrome.i18n UI language (zh-CN) to our locales folder id (zh_CN). */
export function resolveLocaleId(uiLanguage: string): string {
  const normalized = uiLanguage.trim().replace(/-/g, "_")
  if (normalized in CATALOGS) {
    return normalized
  }
  const lower = normalized.toLowerCase()
  for (const id of Object.keys(CATALOGS)) {
    if (id.toLowerCase() === lower) {
      return id
    }
  }
  const base = normalized.split("_")[0] ?? "en"
  if (base === "zh") {
    return "zh_CN"
  }
  if (base in CATALOGS) {
    return base
  }
  return "en"
}

function fallbackMessage(
  key: string,
  substitutions?: string | string[]
): string | undefined {
  const uiLanguage =
    typeof chrome !== "undefined" && chrome.i18n?.getUILanguage
      ? chrome.i18n.getUILanguage()
      : "en"
  const localeId = resolveLocaleId(uiLanguage)
  const entry =
    CATALOGS[localeId]?.[key] ?? CATALOGS.en[key]
  if (!entry?.message) {
    return undefined
  }
  return formatEntry(entry, substitutions)
}

export function t(
  key: string,
  substitutions?: string | string[]
): string {
  const msg = chrome.i18n.getMessage(key, substitutions)
  if (msg) {
    return msg
  }
  return fallbackMessage(key, substitutions) ?? key
}

/** Chrome does not substitute `__MSG_*__` in HTML. Set the tab/sidepanel title in JS. */
export function applyExtensionDocumentTitle(): void {
  if (typeof document === "undefined") {
    return
  }
  document.title = t("extensionName")
}
