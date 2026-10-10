import type { SettingsSectionKey } from "~shared/openOptions"

import { AboutPage } from "./AboutPage"
import { DataPage } from "./DataPage"
import { SettingsPage } from "./SettingsPage"
import { SkillPage } from "./SkillPage"
import type { OptionsNavKey } from "./OptionsSidebar"

type OptionsContentProps = {
  activeKey: OptionsNavKey
  focusSkillId?: string | null
  settingsSection?: SettingsSectionKey | null
  onOpenSkill?: (skillId: string) => void
}

export function OptionsContent({
  activeKey,
  focusSkillId = null,
  settingsSection = null,
  onOpenSkill
}: OptionsContentProps) {
  if (activeKey === "data") {
    return <DataPage onOpenSkill={onOpenSkill} />
  }
  if (activeKey === "skill") {
    return <SkillPage initialSkillId={focusSkillId} />
  }
  if (activeKey === "settings") {
    return <SettingsPage initialSection={settingsSection} />
  }

  return <AboutPage />
}
