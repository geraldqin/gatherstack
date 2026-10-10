import { useCallback, useEffect, useRef, useState } from "react"

import {
  createRecordsRepository,
  createSkillsRepository,
  normalizeRecordPayload,
  openLocalBrainDb,
  type CollectedRecord,
  type CollectedRecordRepository
} from "~db"

import { collectedRecordsToExportJson } from "~shared/collectedRecordAttachment"
import { t } from "~shared/i18n"
import { exportRecordsToSidepanel } from "~shared/pendingDraftAttachment"

import { formatPayloadPreview } from "./formatPayloadPreview"

type EditSnapshot = {
  title: string
  sourceUrl: string
  payload: string
}

function formatCreatedAt(ms: number): string {
  try {
    return new Date(ms).toLocaleString()
  } catch {
    return String(ms)
  }
}

function shortUrl(url: string): string {
  if (!url) return ""
  return url.length > 48 ? `${url.slice(0, 48)}…` : url
}

function skillDisplayLabel(
  skillId: string,
  skillNamesById: Map<string, string>
): string {
  if (!skillId) return t("commonEmptyValue")
  return skillNamesById.get(skillId) ?? skillId
}

function isDirty(
  title: string,
  sourceUrl: string,
  payload: string,
  snap: EditSnapshot | null
): boolean {
  if (!snap) return false
  return (
    title !== snap.title ||
    sourceUrl !== snap.sourceUrl ||
    payload !== snap.payload
  )
}

function snapshotFromRecord(record: CollectedRecord): EditSnapshot {
  return {
    title: record.title,
    sourceUrl: record.sourceUrl,
    payload: formatPayloadPreview(record.payload)
  }
}

export function DataPage({
  onOpenSkill
}: {
  onOpenSkill?: (skillId: string) => void
} = {}) {
  const repoRef = useRef<CollectedRecordRepository | null>(null)
  const [records, setRecords] = useState<CollectedRecord[]>([])
  const [skillNamesById, setSkillNamesById] = useState<Map<string, string>>(
    () => new Map()
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportHint, setExportHint] = useState<string | null>(null)
  const selectAllRef = useRef<HTMLInputElement>(null)

  const [editTitle, setEditTitle] = useState("")
  const [editSourceUrl, setEditSourceUrl] = useState("")
  const [editPayload, setEditPayload] = useState("")
  const [snapshot, setSnapshot] = useState<EditSnapshot | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const selected = records.find((r) => r.id === selectedId) ?? null
  const dirty = isDirty(editTitle, editSourceUrl, editPayload, snapshot)

  const pageIds = records.map((r) => r.id)
  const checkedCount = pageIds.filter((id) => checkedIds.has(id)).length
  const allChecked = pageIds.length > 0 && checkedCount === pageIds.length
  const someChecked = checkedCount > 0 && !allChecked

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someChecked
    }
  }, [someChecked])

  const ensureRepo = useCallback(async () => {
    if (repoRef.current) return repoRef.current
    const db = await openLocalBrainDb()
    const repo = createRecordsRepository(db)
    repoRef.current = repo
    return repo
  }, [])

  const applyEditor = useCallback((record: CollectedRecord) => {
    const snap = snapshotFromRecord(record)
    setEditTitle(snap.title)
    setEditSourceUrl(snap.sourceUrl)
    setEditPayload(snap.payload)
    setSnapshot(snap)
    setSaveError(null)
  }, [])

  const clearEditor = useCallback(() => {
    setEditTitle("")
    setEditSourceUrl("")
    setEditPayload("")
    setSnapshot(null)
    setSaveError(null)
  }, [])

  const confirmDiscardIfDirty = useCallback(() => {
    if (!isDirty(editTitle, editSourceUrl, editPayload, snapshot)) {
      return true
    }
    return window.confirm(t("dataDiscardUnsavedConfirm"))
  }, [editTitle, editSourceUrl, editPayload, snapshot])

  const loadList = useCallback(
    async (keepSelectedId: string | null) => {
      setLoading(true)
      setError(null)
      setDeleteError(null)
      try {
        const repo = await ensureRepo()
        const [list, skills] = await Promise.all([
          repo.list(),
          createSkillsRepository()
            .list()
            .catch(() => [])
        ])
        setRecords(list)
        setSkillNamesById(new Map(skills.map((s) => [s.id, s.name])))
        setCheckedIds(new Set())
        if (keepSelectedId && list.some((r) => r.id === keepSelectedId)) {
          setSelectedId(keepSelectedId)
          const record = list.find((r) => r.id === keepSelectedId)
          if (record) applyEditor(record)
        } else {
          setSelectedId(null)
          clearEditor()
        }
      } catch {
        setError(t("dataLoadFailed"))
        setRecords([])
        setSkillNamesById(new Map())
        setSelectedId(null)
        setCheckedIds(new Set())
        clearEditor()
      } finally {
        setLoading(false)
      }
    },
    [applyEditor, clearEditor, ensureRepo]
  )

  useEffect(() => {
    void loadList(null)
  }, [loadList])

  function toggleChecked(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (allChecked) {
      setCheckedIds(new Set())
      return
    }
    setCheckedIds(new Set(pageIds))
  }

  function selectRecord(id: string | null) {
    if (id === selectedId) {
      if (!confirmDiscardIfDirty()) return
      setSelectedId(null)
      clearEditor()
      return
    }
    if (!confirmDiscardIfDirty()) return
    setDeleteError(null)
    setExportHint(null)
    setSaveError(null)
    if (!id) {
      setSelectedId(null)
      clearEditor()
      return
    }
    const record = records.find((r) => r.id === id)
    if (!record) return
    setSelectedId(id)
    applyEditor(record)
  }

  async function handleSave() {
    if (!selected) return
    const title = editTitle.trim()
    if (!title) {
      setSaveError(t("dataTitleRequired"))
      return
    }
    setSaving(true)
    setSaveError(null)
    setDeleteError(null)
    setExportHint(null)
    try {
      const repo = await ensureRepo()
      const existing = await repo.getById(selected.id)
      if (!existing) {
        setSaveError(t("dataRecordGone"))
        await loadList(null)
        return
      }
      const payload = normalizeRecordPayload(editPayload)
      const next: CollectedRecord = {
        id: selected.id,
        createdAt: selected.createdAt,
        title,
        sourceUrl: editSourceUrl.trim(),
        payload,
        skillId: existing.skillId
      }
      await repo.update(next)
      setRecords((prev) => prev.map((r) => (r.id === next.id ? next : r)))
      applyEditor(next)
    } catch {
      setSaveError(t("commonSaveFailedRetry"))
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteChecked() {
    const ids = pageIds.filter((id) => checkedIds.has(id))
    if (ids.length === 0) return
    if (selectedId && ids.includes(selectedId) && !confirmDiscardIfDirty()) {
      return
    }
    const ok = window.confirm(
      t("dataBulkDeleteConfirm", [String(ids.length)])
    )
    if (!ok) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const repo = await ensureRepo()
      for (const id of ids) {
        await repo.deleteById(id)
      }
      const idSet = new Set(ids)
      const next = records.filter((r) => !idSet.has(r.id))
      setRecords(next)
      setCheckedIds(new Set())
      if (selectedId && idSet.has(selectedId)) {
        setSelectedId(null)
        clearEditor()
      }
    } catch {
      try {
        const repo = await ensureRepo()
        const list = await repo.list()
        setRecords(list)
        setCheckedIds(new Set())
        if (selectedId && list.some((r) => r.id === selectedId)) {
          const record = list.find((r) => r.id === selectedId)
          if (record) applyEditor(record)
        } else {
          setSelectedId(null)
          clearEditor()
        }
      } catch {
        // 刷新失败时保留当前界面
      }
      setDeleteError(t("commonDeleteFailedRetry"))
    } finally {
      setDeleting(false)
    }
  }

  async function handleExportToSidepanel(record: CollectedRecord) {
    await handleExportIds([record.id])
  }

  async function handleExportChecked() {
    const ids = pageIds.filter((id) => checkedIds.has(id))
    await handleExportIds(ids)
  }

  async function handleExportIds(ids: string[]) {
    if (ids.length === 0) return
    setExporting(true)
    setExportHint(null)
    setDeleteError(null)
    try {
      await exportRecordsToSidepanel(ids)
      setExportHint(t("dataExportedToSidepanel"))
    } catch {
      setExportHint(t("dataExportFailedRetry"))
    } finally {
      setExporting(false)
    }
  }

  function recordsByIds(ids: string[]): CollectedRecord[] {
    const byId = new Map(records.map((record) => [record.id, record]))
    return ids.flatMap((id) => {
      const record = byId.get(id)
      return record ? [record] : []
    })
  }

  async function handleCopyToClipboard(record: CollectedRecord) {
    await handleCopyIds([record.id])
  }

  async function handleCopyChecked() {
    const ids = pageIds.filter((id) => checkedIds.has(id))
    await handleCopyIds(ids)
  }

  async function handleCopyIds(ids: string[]) {
    const text = collectedRecordsToExportJson(recordsByIds(ids))
    if (!text) return
    setExportHint(null)
    setDeleteError(null)
    try {
      await navigator.clipboard.writeText(text)
      setExportHint(t("commonCopied"))
    } catch {
      setExportHint(t("commonCopyFailedRetry"))
    }
  }

  async function handleCopyPayload() {
    if (!editPayload) return
    setExportHint(null)
    setDeleteError(null)
    try {
      await navigator.clipboard.writeText(editPayload)
      setExportHint(t("commonCopied"))
    } catch {
      setExportHint(t("commonCopyFailedRetry"))
    }
  }

  function handleRefresh() {
    if (!confirmDiscardIfDirty()) return
    void loadList(selectedId)
  }

  if (error) {
    return (
      <main className="min-w-0 flex-1 overflow-y-auto p-8">
        <h1 className="mb-4 text-xl font-semibold text-slate-900">
          {t("dataTitle")}
        </h1>
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          className="mt-3 rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          onClick={() => void loadList(selectedId)}>
          {t("commonRetry")}
        </button>
      </main>
    )
  }

  const exportHintOk =
    exportHint === t("dataExportedToSidepanel") ||
    exportHint === t("commonCopied")

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{t("dataTitle")}</h1>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span>{t("commonTotalRecords", [String(records.length)])}</span>
          {checkedCount > 0 ? (
            <span>{t("commonSelectedRecords", [String(checkedCount)])}</span>
          ) : null}
          <button
            type="button"
            className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            disabled={loading || deleting || saving}
            onClick={handleRefresh}>
            {t("commonRefresh")}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded border border-slate-200">
        <div
          className={`flex min-h-0 flex-col overflow-hidden ${
            selected
              ? "w-[40%] shrink-0 border-r border-slate-200"
              : "min-w-0 flex-1"
          }`}>
          {loading && records.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">{t("commonLoading")}</p>
          ) : records.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">{t("dataEmpty")}</p>
          ) : (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-slate-700"
                  checked={allChecked}
                  onChange={toggleSelectAll}
                  aria-label={t("commonSelectAllAria")}
                />
                <span className="text-xs text-slate-500">
                  {t("commonSelectAll")}
                </span>
                {checkedCount > 0 ? (
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      disabled={exporting || deleting || saving}
                      onClick={() => void handleCopyChecked()}>
                      {t("commonCopy")}
                    </button>
                    <button
                      type="button"
                      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      disabled={exporting || deleting || saving}
                      onClick={() => void handleExportChecked()}>
                      {exporting
                        ? t("commonExporting")
                        : t("dataExportToSidepanel")}
                    </button>
                    <button
                      type="button"
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                      disabled={deleting || exporting || saving}
                      onClick={() => void handleDeleteChecked()}>
                      {deleting ? t("commonDeleting") : t("commonDelete")}
                    </button>
                  </div>
                ) : null}
              </div>
              {deleteError ? (
                <p className="border-b border-slate-100 px-3 py-2 text-xs text-red-600">
                  {deleteError}
                </p>
              ) : null}
              {exportHint ? (
                <p
                  className={`border-b border-slate-100 px-3 py-2 text-xs ${
                    exportHintOk ? "text-slate-500" : "text-red-600"
                  }`}>
                  {exportHint}
                </p>
              ) : null}
              <ul className="min-h-0 flex-1 overflow-y-auto">
                {records.map((record) => {
                  const active = record.id === selectedId
                  const checked = checkedIds.has(record.id)
                  return (
                    <li key={record.id}>
                      <div
                        className={`flex items-start gap-2 border-b border-slate-100 px-3 py-2.5 ${active ? "bg-slate-100" : "hover:bg-slate-50"
                          }`}>
                        <input
                          type="checkbox"
                          className="mt-1 h-3.5 w-3.5 shrink-0 accent-slate-700"
                          checked={checked}
                          onChange={() => toggleChecked(record.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={t("commonSelectItemAria", [record.title])}
                        />
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => selectRecord(record.id)}>
                          <div className="truncate text-sm font-medium text-slate-900">
                            {record.title}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-slate-500">
                            {formatCreatedAt(record.createdAt)}
                            {record.sourceUrl
                              ? ` · ${shortUrl(record.sourceUrl)}`
                              : ""}
                          </div>
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>

        {selected ? (
          <div className="min-w-0 flex-1 overflow-y-auto p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-slate-900">
                {t("commonDetailTitle")}
                {dirty ? (
                  <span className="ml-2 text-xs font-normal text-amber-600">
                    *
                  </span>
                ) : null}
              </h2>
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                onClick={() => selectRecord(null)}>
                {t("commonClose")}
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-slate-400" htmlFor="data-edit-title">
                  title
                </label>
                <input
                  id="data-edit-title"
                  type="text"
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
                  value={editTitle}
                  disabled={saving || deleting}
                  onChange={(e) => {
                    setEditTitle(e.target.value)
                    setSaveError(null)
                  }}
                />
              </div>
              <div>
                <div className="text-xs text-slate-400">createdAt</div>
                <div className="mt-1 w-full rounded border border-slate-200 bg-slate-100 px-2 py-1.5 text-sm text-slate-500">
                  {formatCreatedAt(selected.createdAt)}
                </div>
              </div>
              <div>
                <label
                  className="text-xs text-slate-400"
                  htmlFor="data-edit-source-url">
                  sourceUrl
                </label>
                <input
                  id="data-edit-source-url"
                  type="text"
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
                  value={editSourceUrl}
                  disabled={saving || deleting}
                  onChange={(e) => {
                    setEditSourceUrl(e.target.value)
                    setSaveError(null)
                  }}
                />
              </div>
              <div>
                <div className="text-xs text-slate-400">skill</div>
                {selected.skillId ? (
                  <button
                    type="button"
                    className="mt-1 w-full break-all rounded border border-slate-200 bg-slate-100 px-2 py-1.5 text-left text-sm text-sky-800 underline decoration-sky-400 underline-offset-2 hover:bg-sky-50 hover:text-sky-950"
                    title={t("sidepanelOpenSkillInOptions", [
                      skillDisplayLabel(selected.skillId, skillNamesById)
                    ])}
                    onClick={() => onOpenSkill?.(selected.skillId)}>
                    {skillDisplayLabel(selected.skillId, skillNamesById)}
                  </button>
                ) : (
                  <div className="mt-1 w-full break-all rounded border border-slate-200 bg-slate-100 px-2 py-1.5 text-sm text-slate-700">
                    {skillDisplayLabel(selected.skillId, skillNamesById)}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-slate-400">id</div>
                <div className="mt-1 w-full break-all rounded border border-slate-200 bg-slate-100 px-2 py-1.5 font-mono text-xs text-slate-500">
                  {selected.id}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <label
                    className="text-xs text-slate-400"
                    htmlFor="data-edit-payload">
                    payload
                  </label>
                  <button
                    type="button"
                    aria-label={t("commonCopy")}
                    title={t("commonCopy")}
                    className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 disabled:opacity-50"
                    disabled={saving || deleting || !editPayload}
                    onClick={() => void handleCopyPayload()}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                      aria-hidden="true">
                      <rect
                        x="9"
                        y="9"
                        width="13"
                        height="13"
                        rx="2"
                        ry="2"
                      />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
                <textarea
                  id="data-edit-payload"
                  className="mt-1 max-h-80 min-h-[12rem] w-full resize-y overflow-auto rounded border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-800"
                  value={editPayload}
                  disabled={saving || deleting}
                  onChange={(e) => {
                    setEditPayload(e.target.value)
                    setSaveError(null)
                  }}
                  onKeyDown={(e) => {
                    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "s") {
                      return
                    }
                    e.preventDefault()
                    if (saving || deleting || !dirty) return
                    void handleSave()
                  }}
                />
              </div>
              {saveError ? (
                <p className="text-xs text-red-600">{saveError}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded border border-slate-800 bg-slate-800 px-3 py-1.5 text-white hover:bg-slate-700 disabled:opacity-50"
                  disabled={saving || deleting || !dirty}
                  onClick={() => void handleSave()}>
                  {saving ? t("commonSaving") : t("commonSave")}
                </button>
                <button
                  type="button"
                  className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={exporting || deleting || saving}
                  onClick={() => void handleCopyToClipboard(selected)}>
                  {t("commonCopy")}
                </button>
                <button
                  type="button"
                  className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={exporting || deleting || saving}
                  onClick={() => void handleExportToSidepanel(selected)}>
                  {exporting
                    ? t("commonExporting")
                    : t("dataExportToSidepanel")}
                </button>
                <button
                  type="button"
                  className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={exporting || deleting || saving}
                  onClick={() => selectRecord(null)}>
                  {t("commonCancel")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  )
}
