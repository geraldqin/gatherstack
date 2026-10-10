import "fake-indexeddb/auto"
import { Window } from "happy-dom"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const happyWindow = new Window()
if (typeof globalThis.DOMParser === "undefined") {
  globalThis.DOMParser = happyWindow.DOMParser as unknown as typeof DOMParser
}

type MessageEntry = {
  message: string
  placeholders?: Record<string, { content: string }>
}

const zhCNMessages = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "locales/zh_CN/messages.json"),
    "utf8"
  )
) as Record<string, MessageEntry>

export function chromeI18nGetMessage(
  key: string,
  substitutions?: string | string[]
): string {
  const entry = zhCNMessages[key]
  if (!entry?.message) {
    return ""
  }
  let msg = entry.message
  const subs =
    substitutions == null
      ? []
      : Array.isArray(substitutions)
        ? substitutions
        : [substitutions]
  if (entry.placeholders) {
    for (const [name, meta] of Object.entries(entry.placeholders)) {
      const index = Number(String(meta.content).replace("$", "")) - 1
      const value = subs[index]
      if (value != null) {
        msg = msg.split(`$${name}$`).join(value)
      }
    }
  }
  return msg
}

const existingChrome =
  typeof globalThis.chrome === "object" && globalThis.chrome != null
    ? globalThis.chrome
    : {}

Object.assign(globalThis, {
  chrome: {
    ...existingChrome,
    i18n: {
      getMessage: chromeI18nGetMessage
    }
  }
})
