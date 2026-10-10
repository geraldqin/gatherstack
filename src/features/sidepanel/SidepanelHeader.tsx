import type { ChatSessionSummary } from "~db"
import { t } from "~shared/i18n"
import { openOptions } from "~shared/openOptions"

type SidepanelHeaderProps = {
  sessions: ChatSessionSummary[]
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onCreateSession: () => void
  onDeleteSession: () => void
}

export function SidepanelHeader({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession
}: SidepanelHeaderProps) {
  const canDelete = activeSessionId != null

  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-3 py-2">
      <select
        className="min-w-0 flex-1 truncate rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-800"
        value={activeSessionId ?? ""}
        aria-label={t("sidepanelSessionAria")}
        onChange={(event) => {
          const id = event.target.value
          if (id) {
            onSelectSession(id)
          }
        }}>
        {sessions.length === 0 ? (
          <option value="">{t("sessionDefaultTitle")}</option>
        ) : (
          sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.title} · {new Date(session.updatedAt).toLocaleString()}
            </option>
          ))
        )}
      </select>
      <button
        type="button"
        className="shrink-0 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        onClick={onCreateSession}>
        {t("commonNew")}
      </button>
      <button
        type="button"
        disabled={!canDelete}
        className="shrink-0 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300"
        onClick={() => {
          if (!canDelete) {
            return
          }
          if (window.confirm(t("sidepanelDeleteSessionConfirm"))) {
            onDeleteSession()
          }
        }}>
        {t("commonDelete")}
      </button>
      <button
        type="button"
        className="shrink-0 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        onClick={() => openOptions()}>
        {t("sidepanelManage")}
      </button>
    </header>
  )
}
