import { useEffect, useState } from "react"

import { t } from "~shared/i18n"

import { asyncParseJobPreview } from "./jobPreview"
import type { AsyncParseJob, AsyncParseJobRunnerSnapshot } from "./types"

type AsyncStopDialogProps = {
  snapshot: AsyncParseJobRunnerSnapshot
  onConfirm: (jobIds: string[]) => void
  onClose: () => void
}

export function AsyncStopDialog({
  snapshot,
  onConfirm,
  onClose
}: AsyncStopDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function renderGroup(title: string, jobs: AsyncParseJob[]) {
    if (jobs.length === 0) {
      return null
    }
    return (
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-slate-500">{title}</p>
        <ul className="space-y-1">
          {jobs.map((job) => (
            <li key={job.id}>
              <label className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-sm text-slate-800 hover:bg-slate-50">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={selected.has(job.id)}
                  onChange={() => toggle(job.id)}
                />
                <span className="min-w-0 break-words">
                  {asyncParseJobPreview(job)}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={t("asyncParseStopDialogTitle")}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}>
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          {t("asyncParseStopDialogTitle")}
        </h2>
        <div className="max-h-64 space-y-3 overflow-y-auto">
          {renderGroup(t("asyncParseStopRunning"), snapshot.running)}
          {renderGroup(t("asyncParseStopQueued"), snapshot.queued)}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
            onClick={onClose}>
            {t("asyncParseStopCancel")}
          </button>
          <button
            type="button"
            className="rounded bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700"
            onClick={() => {
              onConfirm([...selected])
              onClose()
            }}>
            {t("asyncParseStopConfirm")}
          </button>
        </div>
      </div>
    </div>
  )
}
