import { t } from "~shared/i18n"

export type OptionsNavKey = "data" | "skill" | "settings" | "about"

function navLabel(key: OptionsNavKey): string {
  switch (key) {
    case "data":
      return t("optionsNavData")
    case "skill":
      return t("optionsNavSkill")
    case "settings":
      return t("optionsNavSettings")
    case "about":
      return t("optionsNavAbout")
  }
}

function navShortLabel(key: OptionsNavKey): string {
  switch (key) {
    case "data":
      return t("optionsNavDataShort")
    case "skill":
      return "S"
    case "settings":
      return t("optionsNavSettingsShort")
    case "about":
      return t("optionsNavAboutShort")
  }
}

const ITEMS: OptionsNavKey[] = ["data", "skill", "settings", "about"]

type OptionsSidebarProps = {
  activeKey: OptionsNavKey
  onSelect: (key: OptionsNavKey) => void
  collapsed: boolean
  onToggleCollapsed: () => void
}

export function OptionsSidebar({
  activeKey,
  onSelect,
  collapsed,
  onToggleCollapsed
}: OptionsSidebarProps) {
  const toggleLabel = collapsed
    ? t("optionsExpandMenu")
    : t("optionsCollapseMenu")

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-slate-200 bg-slate-50 py-3 transition-[width] ${
        collapsed ? "w-12" : "w-48"
      }`}>
      <div
        className={`flex items-center pb-3 ${
          collapsed ? "justify-center px-1" : "justify-between px-4"
        }`}>
        {collapsed ? null : (
          <div className="truncate text-sm font-semibold text-slate-800">
            {t("extensionName")}
          </div>
        )}
        <button
          type="button"
          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          title={toggleLabel}
          aria-label={toggleLabel}
          aria-expanded={!collapsed}
          onClick={onToggleCollapsed}>
          <CollapseIcon collapsed={collapsed} />
        </button>
      </div>
      <nav
        className={`flex flex-col gap-0.5 ${collapsed ? "px-1" : "px-2"}`}>
        {ITEMS.map((key) => {
          const active = key === activeKey
          const label = navLabel(key)
          return (
            <button
              key={key}
              type="button"
              title={label}
              aria-label={label}
              className={`rounded py-2 text-sm ${
                collapsed ? "px-0 text-center" : "px-3 text-left"
              } ${
                active
                  ? "bg-white font-medium text-slate-900 shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() => onSelect(key)}>
              {collapsed ? navShortLabel(key) : label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true">
      {collapsed ? (
        <path d="M6 3.5 10.5 8 6 12.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M10 3.5 5.5 8 10 12.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}
