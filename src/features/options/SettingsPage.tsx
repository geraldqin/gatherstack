import { useState } from "react"

import { t } from "~shared/i18n"
import {
  coerceSettingsSection,
  type SettingsSectionKey
} from "~shared/openOptions"

import { ModelPage } from "./ModelPage"
import { SendModeSettingsSection } from "./SendModeSettingsSection"

export type { SettingsSectionKey }

/** Visible settings tabs only; `external-db` stays in the type for deep-links but is hidden. */
type VisibleSettingsSection = "model" | "send-mode"

function resolveVisibleSection(
  initialSection: SettingsSectionKey | null
): VisibleSettingsSection {
  const coerced = coerceSettingsSection(initialSection)
  return coerced === "send-mode" ? "send-mode" : "model"
}

type SettingsPageProps = {
  initialSection?: SettingsSectionKey | null
}

export function SettingsPage({
  initialSection = null
}: SettingsPageProps) {
  const [section, setSection] = useState<VisibleSettingsSection>(() =>
    resolveVisibleSection(initialSection)
  )

  const sections: { key: VisibleSettingsSection; label: string }[] = [
    { key: "model", label: t("optionsSettingsSectionModel") },
    {
      key: "send-mode",
      label: t("optionsSettingsSectionAsyncParse")
    }
  ]

  return (
    <main className="min-w-0 flex-1 overflow-y-auto p-8">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">
        {t("optionsSettingsTitle")}
      </h1>
      <nav className="mb-6 flex gap-1 border-b border-slate-200">
        {sections.map((item) => {
          const active = item.key === section
          return (
            <button
              key={item.key}
              type="button"
              className={`-mb-px border-b-2 px-3 py-2 text-sm ${
                active
                  ? "border-slate-800 font-medium text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
              onClick={() => setSection(item.key)}>
              {item.label}
            </button>
          )
        })}
      </nav>
      {section === "model" ? <ModelPage /> : <SendModeSettingsSection />}
    </main>
  )
}
