import { openOptions } from "~shared/openOptions"
import { t } from "~shared/i18n"

type SkillChipProps = {
  name: string
  skillId?: string
  onRemove?: () => void
}

export function SkillChip({ name, skillId, onRemove }: SkillChipProps) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded bg-sky-100 px-2 py-0.5 text-xs text-sky-900">
      {skillId ? (
        <button
          type="button"
          className="truncate text-left text-sky-800 underline decoration-sky-400 underline-offset-2 hover:text-sky-950"
          title={t("sidepanelOpenSkillInOptions", [name])}
          onClick={() => openOptions({ skillId })}>
          {name}
        </button>
      ) : (
        <span className="truncate" title={name}>
          {name}
        </span>
      )}
      {onRemove ? (
        <button
          type="button"
          aria-label={t("sidepanelRemoveSkillAria")}
          className="shrink-0 rounded px-0.5 text-sky-700 hover:bg-sky-200"
          onClick={onRemove}>
          ×
        </button>
      ) : null}
    </span>
  )
}
