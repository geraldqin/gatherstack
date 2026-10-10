import { useCallback, useState } from "react"

import { OptionsContent } from "./OptionsContent"
import { OptionsSidebar, type OptionsNavKey } from "./OptionsSidebar"
import { parseOptionsQuery } from "./parseOptionsQuery"

export function OptionsApp() {
  const initial = parseOptionsQuery()
  const [activeKey, setActiveKey] = useState<OptionsNavKey>(initial.nav)
  const [focusSkillId, setFocusSkillId] = useState<string | null>(
    initial.skillId
  )
  const [settingsSection] = useState(initial.settingsSection)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const openSkill = useCallback((skillId: string) => {
    setFocusSkillId(skillId)
    setActiveKey("skill")
  }, [])

  return (
    <div className="flex h-screen bg-white text-slate-800">
      <OptionsSidebar
        activeKey={activeKey}
        onSelect={setActiveKey}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
      />
      <OptionsContent
        activeKey={activeKey}
        focusSkillId={focusSkillId}
        settingsSection={settingsSection}
        onOpenSkill={openSkill}
      />
    </div>
  )
}
