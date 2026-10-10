import { resolveLocaleId } from "~shared/i18n"

import collectMarkdown from "data-text:./bundled/rent-compare-collect.md"
import collectMarkdownEn from "data-text:./bundled/rent-compare-collect.en.md"
import evaluateMarkdown from "data-text:./bundled/rent-compare-evaluate.md"
import evaluateMarkdownEn from "data-text:./bundled/rent-compare-evaluate.en.md"
import presetJson from "./bundled/preset.json"
import type { PresetCatalogEntry } from "./seedPresetSkills"

type PresetJson = {
  skills: Array<{
    builtinId: string
    version: string
    locales: Record<string, string>
  }>
}

const MARKDOWN_BY_FILE: Record<string, string> = {
  "rent-compare-collect.md": collectMarkdown,
  "rent-compare-collect.en.md": collectMarkdownEn,
  "rent-compare-evaluate.md": evaluateMarkdown,
  "rent-compare-evaluate.en.md": evaluateMarkdownEn
}

function parsePresetJson(raw: unknown): PresetJson {
  if (typeof raw === "string") {
    return JSON.parse(raw) as PresetJson
  }
  if (raw && typeof raw === "object") {
    return raw as PresetJson
  }
  throw new Error("Invalid preset.json bundle")
}

/** Map chrome UI locale (zh_CN / en) to preset.json `locales` keys (zh / en). */
export function resolveSkillPresetLocaleKey(localeId: string): "zh" | "en" {
  return localeId.startsWith("zh") ? "zh" : "en"
}

/**
 * Prefer the extension message locale (`@@ui_locale`) so preset skills follow
 * the same language the Options/Side Panel UI actually shows. Fall back to
 * `getUILanguage()` when the message API is unavailable.
 */
export function currentSkillPresetLocaleKey(): "zh" | "en" {
  const uiLocale =
    typeof chrome !== "undefined" && chrome.i18n?.getMessage
      ? chrome.i18n.getMessage("@@ui_locale")
      : ""
  const uiLanguage =
    uiLocale ||
    (typeof chrome !== "undefined" && chrome.i18n?.getUILanguage
      ? chrome.i18n.getUILanguage()
      : "en")
  return resolveSkillPresetLocaleKey(resolveLocaleId(uiLanguage))
}

export function pickLocalizedPresetFile(
  locales: Record<string, string>,
  localeKey: string
): string {
  const file =
    locales[localeKey] ??
    locales.en ??
    locales.zh ??
    Object.values(locales)[0]
  if (typeof file !== "string" || file.length === 0) {
    throw new Error("Preset skill has empty locales")
  }
  return file
}

/**
 * Runtime catalog for bundled preset skills.
 * Source of truth for editing remains `skills/` at plugin root; copy into
 * `preset/bundled/` (ASCII names) so Plasmo can pack via data-text.
 * `preset.json` `locales` picks zh vs en from the browser UI language.
 */
export function loadPresetCatalog(
  localeKey: "zh" | "en" = currentSkillPresetLocaleKey()
): PresetCatalogEntry[] {
  const preset = parsePresetJson(presetJson)
  return preset.skills.map((item) => {
    const file = pickLocalizedPresetFile(item.locales, localeKey)
    const markdown = MARKDOWN_BY_FILE[file]
    if (typeof markdown !== "string" || markdown.length === 0) {
      throw new Error(`Missing preset markdown for file: ${file}`)
    }
    return {
      builtinId: item.builtinId,
      version: item.version,
      markdown
    }
  })
}
