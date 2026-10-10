import { useEffect, useRef, useState } from "react"

import {
  addSuppressedSendModeBuiltinIds,
  createSendModesRepository,
  normalizeSendModeFlags,
  runSendModePresetSeed,
  type SendModeDocument,
  type SendModesRepository
} from "~db"
import { createLocalBrainDexie, type LocalBrainDexie } from "~db/drivers/indexeddb/dexieDb"
import {
  clampMaxConcurrent,
  DEFAULT_MAX_CONCURRENT,
  MAX_MAX_CONCURRENT,
  MIN_MAX_CONCURRENT
} from "~db/sendModes/normalize"
import { t } from "~shared/i18n"
import { sendModeFlagsSummary } from "~shared/sendMode"
import { sortSendModeDocuments } from "~shared/sendModeResolve"

type EditorState = {
  name: string
  description: string
  callModel: boolean
  autoSave: boolean
  includeHistory: boolean
  async: boolean
  maxConcurrent: number
}

function flagsFromEditor(edit: EditorState) {
  return normalizeSendModeFlags({
    callModel: edit.callModel,
    autoSave: edit.autoSave,
    includeHistory: edit.includeHistory,
    async: edit.async,
    maxConcurrent: edit.maxConcurrent
  })
}

function toEditor(doc: SendModeDocument): EditorState {
  const flags = normalizeSendModeFlags(doc)
  return {
    name: doc.name,
    description: doc.description,
    callModel: flags.callModel,
    autoSave: flags.autoSave,
    includeHistory: flags.includeHistory,
    async: flags.async,
    maxConcurrent: flags.maxConcurrent ?? DEFAULT_MAX_CONCURRENT
  }
}


export function SendModeSettingsSection() {
  const dbRef = useRef<LocalBrainDexie | null>(null)
  const repoRef = useRef<SendModesRepository | null>(null)
  const [modes, setModes] = useState<SendModeDocument[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set())
  const [edit, setEdit] = useState<EditorState | null>(null)
  const [snapshot, setSnapshot] = useState<EditorState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const selectAllRef = useRef<HTMLInputElement>(null)

  const selected = modes.find((m) => m.id === selectedId) ?? null
  const selectedIsBuiltin = selected?.origin === "builtin"
  const dirty =
    edit != null &&
    snapshot != null &&
    JSON.stringify(edit) !== JSON.stringify(snapshot)

  const pageIds = modes.map((m) => m.id)
  const checkedCount = pageIds.filter((id) => checkedIds.has(id)).length
  const allChecked = pageIds.length > 0 && checkedCount === pageIds.length
  const someChecked = checkedCount > 0 && !allChecked

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someChecked
    }
  }, [someChecked])

  function ensureRepo(): SendModesRepository {
    if (!repoRef.current) {
      const db = createLocalBrainDexie()
      dbRef.current = db
      repoRef.current = createSendModesRepository(db)
    }
    return repoRef.current
  }

  async function loadList(preferId?: string | null) {
    setLoading(true)
    setActionError(null)
    try {
      const db = createLocalBrainDexie()
      dbRef.current = db
      await runSendModePresetSeed(db)
      const repo = createSendModesRepository(db)
      repoRef.current = repo
      const list = sortSendModeDocuments(await repo.list())
      setModes(list)
      setCheckedIds(new Set())
      const requested = preferId !== undefined ? preferId : selectedId
      const nextId =
        requested && list.some((m) => m.id === requested) ? requested : null
      if (nextId) {
        const doc = list.find((m) => m.id === nextId)!
        setSelectedId(nextId)
        const ed = toEditor(doc)
        setEdit(ed)
        setSnapshot(ed)
      } else {
        setSelectedId(null)
        setEdit(null)
        setSnapshot(null)
      }
    } catch {
      setActionError(t("sendModeLoadFailed"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadList()
    return () => {
      dbRef.current?.close()
      dbRef.current = null
      repoRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function confirmDiscardIfDirty(): boolean {
    if (!dirty) return true
    return window.confirm(t("sendModeDiscardUnsavedConfirm"))
  }

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

  function closeDetail() {
    if (!confirmDiscardIfDirty()) return
    setActionError(null)
    setSelectedId(null)
    setEdit(null)
    setSnapshot(null)
  }

  function selectMode(id: string) {
    if (id === selectedId) {
      closeDetail()
      return
    }
    if (!confirmDiscardIfDirty()) return
    const doc = modes.find((m) => m.id === id)
    if (!doc) return
    setSelectedId(id)
    const ed = toEditor(doc)
    setEdit(ed)
    setSnapshot(ed)
    setActionError(null)
  }

  function patchEdit(partial: Partial<EditorState>) {
    setEdit((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...partial }
      const flags = flagsFromEditor(next)
      return {
        ...next,
        callModel: flags.callModel,
        autoSave: flags.autoSave,
        includeHistory: flags.includeHistory,
        async: flags.async,
        maxConcurrent: flags.maxConcurrent ?? DEFAULT_MAX_CONCURRENT
      }
    })
  }

  async function handleCreate() {
    if (mutating) return
    if (!confirmDiscardIfDirty()) return
    setMutating(true)
    setActionError(null)
    try {
      const repo = ensureRepo()
      const id = crypto.randomUUID()
      const now = Date.now()
      const flags = normalizeSendModeFlags({
        callModel: true,
        autoSave: false,
        includeHistory: true,
        async: false
      })
      const doc: SendModeDocument = {
        id,
        name: t("sendModeUntitledName"),
        description: "",
        createdAt: now,
        updatedAt: now,
        origin: "user",
        ...flags
      }
      await repo.upsert(doc)
      await loadList(doc.id)
    } catch {
      setActionError(t("sendModeCreateFailedRetry"))
    } finally {
      setMutating(false)
    }
  }

  async function handleCreateFromSelected() {
    if (mutating || !selectedId || !selected) return
    if (!confirmDiscardIfDirty()) return
    setMutating(true)
    setActionError(null)
    try {
      const repo = ensureRepo()
      const id = crypto.randomUUID()
      const now = Date.now()
      const flags = normalizeSendModeFlags(selected)
      const doc: SendModeDocument = {
        id,
        name: t("sendModeForkedName", [selected.name]),
        description: selected.description,
        createdAt: now,
        updatedAt: now,
        origin: "user",
        ...flags
      }
      await repo.upsert(doc)
      await loadList(doc.id)
    } catch {
      setActionError(t("sendModeCreateFromFailedRetry"))
    } finally {
      setMutating(false)
    }
  }

  async function handleSave() {
    if (!selectedId || !edit || !selected) return
    if (selected.origin === "builtin") {
      setActionError(t("sendModeBuiltinReadonlyHint"))
      return
    }
    if (!edit.name.trim()) {
      setActionError(t("sendModeNameRequired"))
      return
    }
    setSaving(true)
    setActionError(null)
    try {
      const repo = ensureRepo()
      const flags = flagsFromEditor(edit)
      const doc: SendModeDocument = {
        id: selectedId,
        name: edit.name.trim(),
        description: edit.description.trim(),
        createdAt: selected.createdAt,
        updatedAt: Date.now(),
        origin: "user",
        ...flags
      }
      await repo.upsert(doc)
      await loadList(doc.id)
    } catch {
      setActionError(t("commonSaveFailedRetry"))
    } finally {
      setSaving(false)
    }
  }

  async function deleteModesByIds(ids: string[]) {
    const repo = ensureRepo()
    const suppressIds = ids
      .map((id) => modes.find((m) => m.id === id))
      .filter(
        (m): m is SendModeDocument =>
          !!m && m.origin === "builtin" && !!m.builtinId
      )
      .map((m) => m.builtinId!)
    if (suppressIds.length > 0) {
      await addSuppressedSendModeBuiltinIds(suppressIds)
    }
    for (const id of ids) {
      await repo.deleteById(id)
    }
    return sortSendModeDocuments(await repo.list())
  }

  async function handleDeleteChecked() {
    const ids = pageIds.filter((id) => checkedIds.has(id))
    if (ids.length === 0 || deleting || mutating) return
    if (selectedId && ids.includes(selectedId) && !confirmDiscardIfDirty()) {
      return
    }
    const deletingBuiltin = ids.some((id) => {
      const mode = modes.find((m) => m.id === id)
      return mode?.origin === "builtin"
    })
    const ok = window.confirm(
      `${t("sendModeBulkDeleteConfirm", [String(ids.length)])}${
        deletingBuiltin ? `\n${t("sendModeBulkDeleteBuiltinHint")}` : ""
      }`
    )
    if (!ok) return
    setDeleting(true)
    setActionError(null)
    try {
      const list = await deleteModesByIds(ids)
      const idSet = new Set(ids)
      setModes(list)
      setCheckedIds(new Set())
      if (selectedId && idSet.has(selectedId)) {
        setSelectedId(null)
        setEdit(null)
        setSnapshot(null)
      }
    } catch {
      try {
        const repo = ensureRepo()
        const list = sortSendModeDocuments(await repo.list())
        setModes(list)
        setCheckedIds(new Set())
        if (selectedId && !list.some((m) => m.id === selectedId)) {
          setSelectedId(null)
          setEdit(null)
          setSnapshot(null)
        }
      } catch {
        // 刷新失败时保留当前界面
      }
      setActionError(t("commonDeleteFailedRetry"))
    } finally {
      setDeleting(false)
    }
  }

  const toolbarBusy = loading || saving || mutating || deleting

  return (
    <div className="flex min-h-[28rem] flex-col">
      <p className="mb-4 text-sm leading-relaxed text-slate-600">
        {t("optionsSendModeIntro")}
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-500">
          {t("commonTotalCount", [String(modes.length)])}
        </span>
        {checkedCount > 0 ? (
          <span className="text-slate-500">
            {t("commonSelectedCount", [String(checkedCount)])}
          </span>
        ) : null}
        <button
          type="button"
          className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          disabled={toolbarBusy}
          onClick={() => void handleCreate()}>
          {t("commonNew")}
        </button>
        <button
          type="button"
          className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          disabled={toolbarBusy}
          onClick={() => void loadList(selectedId)}>
          {t("commonRefresh")}
        </button>
      </div>
      {actionError ? (
        <p className="mb-3 text-sm text-red-600">{actionError}</p>
      ) : null}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded border border-slate-200">
        <div
          className={`flex min-h-0 flex-col overflow-hidden ${
            selectedId
              ? "w-[40%] shrink-0 border-r border-slate-200"
              : "min-w-0 flex-1"
          }`}>
          {loading && modes.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">{t("commonLoading")}</p>
          ) : modes.length === 0 ? null : (
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
                  <button
                    type="button"
                    className="ml-auto rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                    disabled={toolbarBusy}
                    onClick={() => void handleDeleteChecked()}>
                    {deleting ? t("commonDeleting") : t("commonDelete")}
                  </button>
                ) : null}
              </div>
              <ul className="min-h-0 flex-1 overflow-y-auto">
                {modes.map((mode) => {
                  const active = mode.id === selectedId
                  const checked = checkedIds.has(mode.id)
                  const displayName = active && edit ? edit.name : mode.name
                  return (
                    <li key={mode.id}>
                      <div
                        className={`flex items-start gap-2 border-b border-slate-100 px-3 py-2.5 ${
                          active ? "bg-slate-100" : "hover:bg-slate-50"
                        }`}>
                        <input
                          type="checkbox"
                          className="mt-1 h-3.5 w-3.5 shrink-0 accent-slate-700"
                          checked={checked}
                          onChange={() => toggleChecked(mode.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={t("commonSelectItemAria", [displayName])}
                        />
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => selectMode(mode.id)}>
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-slate-900">
                              {displayName}
                            </span>
                            {mode.origin === "builtin" ? (
                              <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700">
                                {t("skillBadgeBuiltin")}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {sendModeFlagsSummary(mode)}
                          </p>
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
        {selectedId && edit ? (
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-4">
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
                disabled={saving || deleting}
                onClick={closeDetail}>
                {t("commonClose")}
              </button>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {selectedIsBuiltin ? (
                <button
                  type="button"
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={toolbarBusy}
                  onClick={() => void handleCreateFromSelected()}>
                  {t("skillCreateFromExisting")}
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
                  disabled={toolbarBusy || !dirty}
                  onClick={() => void handleSave()}>
                  {saving ? t("commonSaving") : t("commonSave")}
                </button>
              )}
            </div>
            {selectedIsBuiltin ? (
              <p className="mb-3 text-xs text-slate-500">
                {t("sendModeBuiltinReadonlyHint")}
              </p>
            ) : null}
            <label className="mb-3 block text-sm text-slate-700">
              <span className="mb-1 block">{t("sendModeFieldName")}</span>
              <input
                type="text"
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50"
                disabled={selectedIsBuiltin}
                value={edit.name}
                onChange={(e) => patchEdit({ name: e.target.value })}
              />
            </label>
            <label className="mb-3 block text-sm text-slate-700">
              <span className="mb-1 block">{t("sendModeFieldDescription")}</span>
              <textarea
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50"
                rows={2}
                disabled={selectedIsBuiltin}
                value={edit.description}
                onChange={(e) => patchEdit({ description: e.target.value })}
              />
            </label>
            <fieldset className="space-y-2 text-sm text-slate-700">
              <legend className="mb-1 font-medium">
                {t("sendModeFlagsLegend")}
              </legend>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-slate-700"
                  disabled={selectedIsBuiltin}
                  checked={edit.callModel}
                  onChange={(e) => patchEdit({ callModel: e.target.checked })}
                />
                {t("sendModeFlagCallModel")}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-slate-700"
                  disabled={selectedIsBuiltin || !edit.callModel}
                  checked={edit.autoSave}
                  onChange={(e) => patchEdit({ autoSave: e.target.checked })}
                />
                {t("sendModeFlagAutoSaveLabel")}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-slate-700"
                  disabled={selectedIsBuiltin || !edit.callModel || edit.async}
                  checked={edit.includeHistory}
                  onChange={(e) =>
                    patchEdit({ includeHistory: e.target.checked })
                  }
                />
                {t("sendModeFlagIncludeHistory")}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-slate-700"
                  disabled={selectedIsBuiltin || !edit.callModel}
                  checked={edit.async}
                  onChange={(e) => patchEdit({ async: e.target.checked })}
                />
                {t("sendModeFlagAsyncLabel")}
              </label>
              {edit.async ? (
                <label className="block pt-1">
                  <span className="mb-1 block">
                    {t("optionsAsyncParseMaxConcurrent")}
                  </span>
                  <input
                    type="number"
                    min={MIN_MAX_CONCURRENT}
                    max={MAX_MAX_CONCURRENT}
                    className="w-28 rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50"
                    disabled={selectedIsBuiltin}
                    value={edit.maxConcurrent}
                    onChange={(e) =>
                      patchEdit({
                        maxConcurrent: clampMaxConcurrent(e.target.value)
                      })
                    }
                  />
                  <span className="mt-1 block text-xs text-slate-500">
                    {t("optionsAsyncParseMaxConcurrentHint")}
                  </span>
                </label>
              ) : null}
            </fieldset>
          </div>
        ) : null}
      </div>
    </div>
  )
}
