import { useCallback, useEffect, useRef, useState } from "react"

import {
  MAX_SKILL_MARKDOWN_BYTES,
  addSuppressedBuiltinIds,
  buildDefaultSkillMarkdown,
  createSkillsRepository,
  parseSkillFrontmatter,
  runSkillPresetSeed,
  sanitizeSkillFilename,
  withSkillFrontmatterName,
  type SkillDocument,
  type SkillsRepository
} from "~db"
import { createLocalBrainDexie, type LocalBrainDexie } from "~db/drivers/indexeddb/dexieDb"
import { t } from "~shared/i18n"

type EditSnapshot = {
  filename: string
  markdown: string
}

function formatUpdatedAt(ms: number): string {
  try {
    return new Date(ms).toLocaleString()
  } catch {
    return String(ms)
  }
}

function SkillBadges({ skill }: { skill: SkillDocument }) {
  if (skill.origin !== "builtin") return null
  return (
    <span className="ml-1 inline-flex flex-wrap items-center gap-1 align-middle">
      <span className="rounded bg-slate-200 px-1 py-0.5 text-[10px] font-medium text-slate-700">
        {t("skillBadgeBuiltin")}
      </span>
      {skill.version ? (
        <span className="rounded bg-slate-100 px-1 py-0.5 text-[10px] text-slate-600">
          v{skill.version}
        </span>
      ) : null}
    </span>
  )
}

function isDirty(
  filename: string,
  markdown: string,
  snap: EditSnapshot | null
): boolean {
  if (!snap) return false
  return filename !== snap.filename || markdown !== snap.markdown
}

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = sanitizeSkillFilename(filename)
  a.click()
  // Delay revoke so the browser can start the download from the object URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function SkillPage({
  initialSkillId = null
}: {
  initialSkillId?: string | null
}) {
  const repoRef = useRef<SkillsRepository | null>(null)
  const dbRef = useRef<LocalBrainDexie | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [skills, setSkills] = useState<SkillDocument[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set())
  const [editFilename, setEditFilename] = useState("")
  const [editMarkdown, setEditMarkdown] = useState("")
  const [snapshot, setSnapshot] = useState<EditSnapshot | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const selectAllRef = useRef<HTMLInputElement>(null)

  const dirty = isDirty(editFilename, editMarkdown, snapshot)
  const selected = skills.find((s) => s.id === selectedId) ?? null
  const selectedIsBuiltin = selected?.origin === "builtin"
  const toolbarBusy = loading || saving || deleting || mutating
  const editorLocked = saving || deleting || selectedIsBuiltin

  const pageIds = skills.map((s) => s.id)
  const checkedCount = pageIds.filter((id) => checkedIds.has(id)).length
  const allChecked = pageIds.length > 0 && checkedCount === pageIds.length
  const someChecked = checkedCount > 0 && !allChecked

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someChecked
    }
  }, [someChecked])

  const ensureRepo = useCallback(() => {
    if (repoRef.current && dbRef.current) return repoRef.current
    const db = createLocalBrainDexie()
    dbRef.current = db
    const repo = createSkillsRepository(db)
    repoRef.current = repo
    return repo
  }, [])

  const confirmDiscardIfDirty = useCallback(() => {
    if (!isDirty(editFilename, editMarkdown, snapshot)) return true
    return window.confirm(t("skillDiscardUnsavedConfirm"))
  }, [editFilename, editMarkdown, snapshot])

  const applyEditor = useCallback((doc: SkillDocument) => {
    setEditFilename(doc.filename)
    setEditMarkdown(doc.markdown)
    setSnapshot({ filename: doc.filename, markdown: doc.markdown })
  }, [])

  const clearEditor = useCallback(() => {
    setEditFilename("")
    setEditMarkdown("")
    setSnapshot(null)
  }, [])

  const selectDoc = useCallback(
    (doc: SkillDocument | null) => {
      if (!doc) {
        setSelectedId(null)
        clearEditor()
        return
      }
      setSelectedId(doc.id)
      applyEditor(doc)
    },
    [applyEditor, clearEditor]
  )

  const loadList = useCallback(
    async (keepSelectedId: string | null, options?: { skipDirtyCheck?: boolean }) => {
      if (!options?.skipDirtyCheck && !confirmDiscardIfDirty()) return

      setLoading(true)
      setError(null)
      setActionError(null)
      try {
        const repo = ensureRepo()
        const db = dbRef.current
        if (db) {
          try {
            await runSkillPresetSeed(db)
          } catch (seedErr) {
            console.error("skill preset seed failed", seedErr)
          }
        }
        const list = await repo.list()
        setSkills(list)
        setCheckedIds(new Set())

        const kept =
          keepSelectedId && list.some((s) => s.id === keepSelectedId)
            ? list.find((s) => s.id === keepSelectedId)!
            : null
        selectDoc(kept)
      } catch (err) {
        console.error("SkillPage loadList failed", err)
        const detail =
          err instanceof Error && err.message
            ? err.message
            : t("commonUnknownError")
        setError(t("skillLoadFailed", [detail]))
        setSkills([])
        setCheckedIds(new Set())
        selectDoc(null)
      } finally {
        setLoading(false)
      }
    },
    [confirmDiscardIfDirty, ensureRepo, selectDoc]
  )

  useEffect(() => {
    void loadList(initialSkillId, { skipDirtyCheck: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once with deep-link id
  }, [])

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

  function selectSkill(id: string) {
    if (id === selectedId) {
      if (!confirmDiscardIfDirty()) return
      setActionError(null)
      selectDoc(null)
      return
    }
    if (!confirmDiscardIfDirty()) return
    const doc = skills.find((s) => s.id === id)
    if (!doc) return
    setActionError(null)
    setSelectedId(doc.id)
    applyEditor(doc)
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
      const markdown = buildDefaultSkillMarkdown()
      const { name } = parseSkillFrontmatter(markdown)
      const doc: SkillDocument = {
        id,
        name,
        filename: `skill-${id.slice(0, 8)}.md`,
        markdown,
        createdAt: now,
        updatedAt: now,
        origin: "user"
      }
      await repo.upsert(doc)
      const list = await repo.list()
      setSkills(list)
      setSelectedId(doc.id)
      applyEditor(doc)
    } catch {
      setActionError(t("skillCreateFailedRetry"))
    } finally {
      setMutating(false)
    }
  }

  async function handleCreateFromSelected() {
    if (mutating || !selectedId) return
    if (!confirmDiscardIfDirty()) return
    setMutating(true)
    setActionError(null)
    try {
      const repo = ensureRepo()
      const source = skills.find((s) => s.id === selectedId)
      if (!source) {
        setActionError(t("skillCreateFromFailedRetry"))
        return
      }
      const sourceMarkdown = source.markdown
      const { name: sourceName } = parseSkillFrontmatter(sourceMarkdown)
      const forkedName = t("skillForkedName", [sourceName])
      const markdown = withSkillFrontmatterName(sourceMarkdown, forkedName)
      const id = crypto.randomUUID()
      const now = Date.now()
      const doc: SkillDocument = {
        id,
        name: forkedName,
        filename: sanitizeSkillFilename(`${forkedName}.md`),
        markdown,
        createdAt: now,
        updatedAt: now,
        origin: "user"
      }
      await repo.upsert(doc)
      const list = await repo.list()
      setSkills(list)
      setSelectedId(doc.id)
      applyEditor(doc)
    } catch {
      setActionError(t("skillCreateFromFailedRetry"))
    } finally {
      setMutating(false)
    }
  }

  async function handleSave() {
    if (!selectedId) return
    const existing = skills.find((s) => s.id === selectedId)
    if (existing?.origin === "builtin") {
      setActionError(t("skillBuiltinReadonlyHint"))
      return
    }
    const sanitized = sanitizeSkillFilename(editFilename)
    if (!editFilename.trim() || !sanitized) {
      setActionError(t("skillFilenameRequired"))
      return
    }
    const markdownBytes = new TextEncoder().encode(editMarkdown).byteLength
    if (markdownBytes > MAX_SKILL_MARKDOWN_BYTES) {
      setActionError(t("skillContentTooLarge"))
      return
    }
    setSaving(true)
    setActionError(null)
    try {
      const repo = ensureRepo()
      const now = Date.now()
      const { name } = parseSkillFrontmatter(editMarkdown)
      const doc: SkillDocument = {
        id: selectedId,
        name,
        filename: sanitized,
        markdown: editMarkdown,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        origin: "user"
      }
      await repo.upsert(doc)
      const list = await repo.list()
      setSkills(list)
      setEditFilename(sanitized)
      setSnapshot({ filename: sanitized, markdown: editMarkdown })
    } catch {
      setActionError(t("commonSaveFailedRetry"))
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
    const deletingBuiltin = ids.some((id) => {
      const s = skills.find((x) => x.id === id)
      return s?.origin === "builtin"
    })
    const ok = window.confirm(
      `${t("skillBulkDeleteConfirm", [String(ids.length)])}${
        deletingBuiltin ? `\n${t("skillBulkDeleteBuiltinHint")}` : ""
      }`
    )
    if (!ok) return
    setDeleting(true)
    setActionError(null)
    try {
      const repo = ensureRepo()
      const suppressIds = ids
        .map((id) => skills.find((s) => s.id === id))
        .filter(
          (s): s is SkillDocument =>
            !!s && s.origin === "builtin" && !!s.builtinId
        )
        .map((s) => s.builtinId!)
      if (suppressIds.length > 0) {
        await addSuppressedBuiltinIds(suppressIds)
      }
      for (const id of ids) {
        await repo.deleteById(id)
      }
      const idSet = new Set(ids)
      const list = await repo.list()
      setSkills(list)
      setCheckedIds(new Set())
      if (selectedId && idSet.has(selectedId)) {
        selectDoc(null)
      }
    } catch {
      try {
        const repo = ensureRepo()
        const list = await repo.list()
        setSkills(list)
        setCheckedIds(new Set())
        if (selectedId && !list.some((s) => s.id === selectedId)) {
          selectDoc(null)
        }
      } catch {
        // 刷新失败时保留当前界面
      }
      setActionError(t("commonDeleteFailedRetry"))
    } finally {
      setDeleting(false)
    }
  }

  function handleExport() {
    if (!selectedId) return
    downloadMarkdown(editFilename || "skill.md", editMarkdown)
  }

  async function handleImportFile(file: File) {
    if (mutating) return
    if (!confirmDiscardIfDirty()) return
    setMutating(true)
    setActionError(null)

    try {
      if (file.size > MAX_SKILL_MARKDOWN_BYTES) {
        setActionError(t("skillFileTooLarge"))
        return
      }

      const text = await file.text()
      const repo = ensureRepo()
      const id = crypto.randomUUID()
      const now = Date.now()
      const filename = sanitizeSkillFilename(file.name || "skill.md")
      const { name } = parseSkillFrontmatter(text)
      const doc: SkillDocument = {
        id,
        name,
        filename,
        markdown: text,
        createdAt: now,
        updatedAt: now,
        origin: "user"
      }
      await repo.upsert(doc)
      const list = await repo.list()
      setSkills(list)
      setSelectedId(doc.id)
      applyEditor(doc)
    } catch {
      setActionError(t("skillImportFailedRetry"))
    } finally {
      setMutating(false)
    }
  }

  if (error) {
    return (
      <main className="min-w-0 flex-1 overflow-y-auto p-8">
        <h1 className="mb-4 text-xl font-semibold text-slate-900">
          {t("skillTitle")}
        </h1>
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          className="mt-3 rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          onClick={() => void loadList(selectedId, { skipDirtyCheck: true })}>
          {t("commonRetry")}
        </button>
      </main>
    )
  }

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">
          {t("skillTitle")}
        </h1>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span>{t("commonTotalCount", [String(skills.length)])}</span>
          {checkedCount > 0 ? (
            <span>{t("commonSelectedCount", [String(checkedCount)])}</span>
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
            onClick={() => fileInputRef.current?.click()}>
            {t("commonImport")}
          </button>
          <button
            type="button"
            className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            disabled={toolbarBusy}
            onClick={() => void loadList(selectedId)}>
            {t("commonRefresh")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,text/markdown"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ""
              if (file) void handleImportFile(file)
            }}
          />
        </div>
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
          {loading && skills.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">{t("commonLoading")}</p>
          ) : skills.length === 0 ? null : (
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
                {skills.map((skill) => {
                  const active = skill.id === selectedId
                  const checked = checkedIds.has(skill.id)
                  const displayName = active
                    ? parseSkillFrontmatter(editMarkdown).name
                    : skill.name
                  return (
                    <li key={skill.id}>
                      <div
                        className={`flex items-start gap-2 border-b border-slate-100 px-3 py-2.5 ${
                          active ? "bg-slate-100" : "hover:bg-slate-50"
                        }`}>
                        <input
                          type="checkbox"
                          className="mt-1 h-3.5 w-3.5 shrink-0 accent-slate-700"
                          checked={checked}
                          onChange={() => toggleChecked(skill.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={t("commonSelectItemAria", [displayName])}
                        />
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => selectSkill(skill.id)}>
                          <div className="truncate text-sm font-medium text-slate-900">
                            {displayName}
                            <SkillBadges skill={skill} />
                          </div>
                          <div className="mt-0.5 truncate text-xs text-slate-500">
                            {skill.filename} · {formatUpdatedAt(skill.updatedAt)}
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

        {selectedId ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-slate-900">
                {t("commonDetailTitle")}
              </h2>
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                disabled={saving || deleting}
                onClick={() => {
                  if (!confirmDiscardIfDirty()) return
                  setActionError(null)
                  selectDoc(null)
                }}>
                {t("commonClose")}
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              {selected ? (
                <p className="text-xs text-slate-500">
                  {t("skillOriginLabel")}
                  {selected.origin === "builtin"
                    ? t("skillOriginBuiltin")
                    : t("skillOriginUser")}
                  {selected.version
                    ? t("skillVersionPrefix", [selected.version])
                    : ""}
                </p>
              ) : null}
              {selectedIsBuiltin ? (
                <p className="text-xs text-amber-700">
                  {t("skillBuiltinReadonlyHint")}
                </p>
              ) : null}
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  filename
                </label>
                <input
                  type="text"
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
                  value={editFilename}
                  onChange={(e) => {
                    setEditFilename(e.target.value)
                    setActionError(null)
                  }}
                  onKeyDown={(e) => {
                    if (
                      !(e.ctrlKey || e.metaKey) ||
                      e.key.toLowerCase() !== "s"
                    ) {
                      return
                    }
                    e.preventDefault()
                    if (editorLocked || mutating) return
                    void handleSave()
                  }}
                  disabled={editorLocked}
                  readOnly={selectedIsBuiltin}
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
                <label className="mb-1 block text-xs text-slate-400">
                  markdown
                  {dirty && !selectedIsBuiltin ? (
                    <span className="ml-2 text-amber-600">
                      {t("commonUnsaved")}
                    </span>
                  ) : null}
                </label>
                <textarea
                  className="min-h-0 w-full flex-1 resize-none rounded border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-800 disabled:text-slate-500"
                  value={editMarkdown}
                  onChange={(e) => {
                    setEditMarkdown(e.target.value)
                    setActionError(null)
                  }}
                  onKeyDown={(e) => {
                    if (
                      !(e.ctrlKey || e.metaKey) ||
                      e.key.toLowerCase() !== "s"
                    ) {
                      return
                    }
                    e.preventDefault()
                    if (editorLocked || mutating) return
                    void handleSave()
                  }}
                  disabled={editorLocked}
                  readOnly={selectedIsBuiltin}
                  spellCheck={false}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedIsBuiltin ? null : (
                  <button
                    type="button"
                    className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    disabled={saving || deleting || mutating}
                    onClick={() => void handleSave()}>
                    {saving ? t("commonSaving") : t("commonSave")}
                  </button>
                )}
                <button
                  type="button"
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={saving || deleting || mutating}
                  onClick={() => void handleCreateFromSelected()}>
                  {t("skillCreateFromExisting")}
                </button>
                <button
                  type="button"
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={saving || deleting || mutating}
                  onClick={handleExport}>
                  {t("commonExport")}
                </button>
                <button
                  type="button"
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={saving || deleting || mutating}
                  onClick={() => {
                    if (!confirmDiscardIfDirty()) return
                    setActionError(null)
                    selectDoc(null)
                  }}>
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

