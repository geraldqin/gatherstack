import type { SettingsSectionKey } from "~shared/openOptions"
import { normalizeSettingsSection } from "~shared/openOptions"

import type { OptionsNavKey } from "./OptionsSidebar"

export type OptionsQuery = {
  nav: OptionsNavKey
  skillId: string | null
  settingsSection: SettingsSectionKey | null
}

const NAV_KEYS: OptionsNavKey[] = ["data", "skill", "settings", "about"]

export function parseOptionsQuery(
  search: string = typeof window !== "undefined" ? window.location.search : ""
): OptionsQuery {
  const params = new URLSearchParams(search)
  const skillIdRaw = params.get("skillId")?.trim() || null
  const settingsSection = normalizeSettingsSection(params.get("section"))
  const navRaw = params.get("nav")
  if (skillIdRaw) {
    return { nav: "skill", skillId: skillIdRaw, settingsSection: null }
  }
  if (navRaw && (NAV_KEYS as string[]).includes(navRaw)) {
    return {
      nav: navRaw as OptionsNavKey,
      skillId: null,
      settingsSection: navRaw === "settings" ? settingsSection : null
    }
  }
  return { nav: "data", skillId: null, settingsSection: null }
}
