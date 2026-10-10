export type SettingsSectionKey =
  | "model"
  | "async-parse"
  | "send-mode"
  | "external-db"

export type OpenOptionsParams = {
  nav?: "data" | "skill" | "settings" | "about"
  skillId?: string
  /** Deep-link into Settings tabs; implies nav=settings when set alone. */
  settingsSection?: SettingsSectionKey
}

const SETTINGS_SECTION_KEYS: SettingsSectionKey[] = [
  "model",
  "async-parse",
  "send-mode",
  "external-db"
]

/**
 * Map legacy / hidden section keys to a visible panel.
 * - `async-parse` → send-mode
 * - `external-db` → model (placeholder tab currently hidden)
 */
export function coerceSettingsSection(
  value: SettingsSectionKey | null
): SettingsSectionKey | null {
  if (value === "async-parse") return "send-mode"
  if (value === "external-db") return "model"
  return value
}

export function normalizeSettingsSection(
  value: unknown
): SettingsSectionKey | null {
  if (
    typeof value === "string" &&
    (SETTINGS_SECTION_KEYS as string[]).includes(value)
  ) {
    return value as SettingsSectionKey
  }
  return null
}

/** Build options page URL with optional deep-link query. Pure for tests. */
export function buildOptionsUrl(
  getUrl: (path: string) => string,
  params?: OpenOptionsParams
): string {
  const base = getUrl("options.html")
  if (!params?.nav && !params?.skillId && !params?.settingsSection) {
    return base
  }
  const url = new URL(base)
  if (params.skillId) {
    url.searchParams.set("nav", "skill")
    url.searchParams.set("skillId", params.skillId)
  } else {
    const nav =
      params.nav ?? (params.settingsSection ? "settings" : undefined)
    if (nav) {
      url.searchParams.set("nav", nav)
    }
    if (params.settingsSection && nav === "settings") {
      url.searchParams.set("section", params.settingsSection)
    }
  }
  return url.toString()
}

export function openOptions(params?: OpenOptionsParams): void {
  if (!params?.nav && !params?.skillId && !params?.settingsSection) {
    void chrome.runtime.openOptionsPage()
    return
  }
  const url = buildOptionsUrl((path) => chrome.runtime.getURL(path), params)
  void chrome.tabs.create({ url })
}
