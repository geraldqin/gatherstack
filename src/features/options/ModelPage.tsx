import { useEffect, useRef, useState } from "react"

import {
  downloadGeminiNano,
  probeGeminiNanoAvailability,
  type GeminiNanoAvailability
} from "~shared/geminiNano"
import { t } from "~shared/i18n"
import { listProviderModels } from "~shared/listProviderModels"
import {
  addProviderItem,
  displayProviderName,
  EMPTY_MODEL_CONFIG,
  loadModelConfig,
  LOCAL_GEMINI_NANO_ID,
  persistModelConfig,
  PRESET_BASE_URL,
  PRESET_LABELS,
  removeProviderItem,
  setActiveProviderItem,
  updateProviderItem,
  validateProviderForm,
  type ModelConfig,
  type ProviderFormInput,
  type CloudProviderPreset
} from "~shared/modelConfig"
import { openOnDeviceInternals } from "~shared/openOnDeviceInternals"

import { isNanoReloadVisible } from "./nanoStatusActions"

const EMPTY_FORM: ProviderFormInput = {
  preset: "custom",
  name: "",
  apiKey: "",
  baseUrl: "",
  selectedModelId: ""
}

export function ModelPage() {
  const [config, setConfig] = useState<ModelConfig>(EMPTY_MODEL_CONFIG)
  const [form, setForm] = useState<ProviderFormInput>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [listedIds, setListedIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [nanoStatus, setNanoStatus] =
    useState<GeminiNanoAvailability>("unavailable")
  const [nanoProgress, setNanoProgress] = useState<number | null>(null)
  const [nanoLoading, setNanoLoading] = useState(false)
  const [nanoChecking, setNanoChecking] = useState(false)
  const [nanoWaitSeconds, setNanoWaitSeconds] = useState<number | null>(null)
  const nanoLoadingRef = useRef(false)
  const nanoAbortRef = useRef<AbortController | null>(null)

  function handleStopNanoWait() {
    nanoAbortRef.current?.abort()
  }

  async function handleLoadNano() {
    if (nanoLoadingRef.current) {
      return
    }
    nanoLoadingRef.current = true
    setNanoLoading(true)
    setError(null)
    setNanoStatus("downloading")
    // Percent only from CreateMonitor / downloadprogress (not optimistic).
    setNanoProgress(null)
    setNanoWaitSeconds(0)
    const startedAt = Date.now()
    const waitTimer = window.setInterval(() => {
      setNanoWaitSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    const controller = new AbortController()
    nanoAbortRef.current = controller
    try {
      const result = await downloadGeminiNano({
        signal: controller.signal,
        onProgress: (loaded) => {
          setNanoProgress(loaded)
        }
      })
      if (!result.ok) {
        setError(result.message)
      }
      // aborted: no error toast — user chose 停止等待
      setNanoStatus(await probeGeminiNanoAvailability())
    } finally {
      window.clearInterval(waitTimer)
      if (nanoAbortRef.current === controller) {
        nanoAbortRef.current = null
      }
      nanoLoadingRef.current = false
      setNanoLoading(false)
      setNanoProgress(null)
      setNanoWaitSeconds(null)
    }
  }

  useEffect(() => {
    void loadModelConfig().then((result) => {
      setConfig(result.config)
      if (result.corrupt) {
        setNotice(t("modelConfigLoadFailedNotice"))
      }
    })
    void (async () => {
      const status = await probeGeminiNanoAvailability()
      setNanoStatus(status)
      if (status === "downloading") {
        void handleLoadNano()
      }
    })()
    // Mount-only: subscribe to in-flight Nano download for percent text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyPreset(preset: CloudProviderPreset, prev: ProviderFormInput): ProviderFormInput {
    return {
      ...prev,
      preset,
      baseUrl:
        preset === "custom"
          ? prev.preset === "custom"
            ? prev.baseUrl
            : ""
          : PRESET_BASE_URL[preset]
    }
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setListedIds([])
    setFormOpen(true)
    setError(null)
    setPendingDeleteId(null)
  }

  function openEdit(id: string) {
    const item = config.providers.find((provider) => provider.id === id)
    if (!item) {
      return
    }
    const nextForm: ProviderFormInput = {
      preset: item.preset as CloudProviderPreset,
      name: item.name,
      apiKey: item.apiKey,
      baseUrl: item.baseUrl,
      selectedModelId: item.selectedModelId ?? ""
    }
    setEditingId(id)
    setForm(nextForm)
    setListedIds([])
    setFormOpen(true)
    setError(null)
    setPendingDeleteId(null)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setListedIds([])
    setError(null)
  }

  async function persist(next: ModelConfig) {
    await persistModelConfig(next)
    setConfig(next)
  }

  async function refreshListed(input: ProviderFormInput) {
    const message = validateProviderForm(input)
    if (message) {
      setError(message)
      return
    }
    setRefreshing(true)
    setError(null)
    const result = await listProviderModels(
      input.preset === "custom"
        ? input.baseUrl.trim()
        : PRESET_BASE_URL[input.preset],
      input.apiKey.trim()
    )
    setRefreshing(false)
    if (result.ok === false) {
      setError(result.message)
      return
    }
    setListedIds(result.ids)
    if (!input.selectedModelId.trim() && result.ids[0]) {
      setForm((prev) => ({ ...prev, selectedModelId: result.ids[0] }))
    }
  }

  async function handleSave() {
    const message = validateProviderForm(form)
    if (message) {
      setError(message)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const id = editingId ?? crypto.randomUUID()
      const next = editingId
        ? updateProviderItem(config, editingId, form)
        : addProviderItem(config, form, id)
      await persist(next)
      const saved = next.providers.find((item) => item.id === id)
      if (saved && !form.selectedModelId.trim()) {
        const listed = await listProviderModels(saved.baseUrl, saved.apiKey)
        if (listed.ok && listed.ids[0]) {
          await persist(
            updateProviderItem(next, id, {
              ...form,
              selectedModelId: listed.ids[0]
            })
          )
        }
      }
      closeForm()
    } catch {
      setError(t("commonSaveFailedRetryLater"))
    } finally {
      setSaving(false)
    }
  }

  async function handleSetActive(id: string) {
    setError(null)
    try {
      await persist(setActiveProviderItem(config, id))
    } catch {
      setError(t("modelSetDefaultFailedRetry"))
    }
  }

  async function handleUninstallNano() {
    setError(null)
    setNotice(null)
    const result = await openOnDeviceInternals()
    if (result === "copied") {
      setNotice(t("modelNanoUninstallCopied"))
      return
    }
    if (result === "failed") {
      setError(t("modelNanoUninstallFailed"))
    }
  }

  async function handleCheckNanoStatus() {
    setNanoChecking(true)
    setError(null)
    try {
      const status = await probeGeminiNanoAvailability()
      setNanoStatus(status)
      if (status === "downloading") {
        void handleLoadNano()
      }
    } finally {
      setNanoChecking(false)
    }
  }

  async function handleConfirmDelete(id: string) {
    setError(null)
    try {
      await persist(removeProviderItem(config, id))
      setPendingDeleteId(null)
      if (editingId === id) {
        closeForm()
      }
    } catch {
      setError(t("modelDeleteFailedRetryLater"))
    }
  }

  const empty = config.providers.length === 0
  const addressReadOnly = form.preset !== "custom"
  const nanoActive = config.activeProviderId === LOCAL_GEMINI_NANO_ID
  const nanoReady = nanoStatus === "available"
  const nanoCanLoad = nanoStatus === "downloadable" && !nanoLoading
  const nanoShowReload = isNanoReloadVisible(nanoStatus)
  const nanoActionsBusy = nanoLoading || nanoChecking
  const nanoPercent =
    nanoProgress == null ? null : Math.round(nanoProgress * 100)
  const nanoWaitLabel =
    nanoWaitSeconds == null
      ? ""
      : t("modelNanoWaitSuffix", [String(nanoWaitSeconds)])
  const nanoStatusText =
    nanoStatus === "available"
      ? t("modelNanoReady")
      : nanoStatus === "downloadable"
        ? t("modelNanoDownloadable")
        : nanoStatus === "downloading"
          ? nanoPercent == null
            ? t("modelNanoDownloading", [nanoWaitLabel])
            : t("modelNanoDownloadingPercent", [
                String(nanoPercent),
                nanoWaitLabel
              ])
          : t("modelNanoUnsupported")

  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">{t("modelFlashRecommendHint")}</p>
      <div className="mb-6 flex justify-end">
        <button
          type="button"
          className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
          onClick={openCreate}>
          {t("modelAdd")}
        </button>
      </div>

      {notice ? (
        <p className="mb-4 text-sm text-amber-700">{notice}</p>
      ) : null}
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      <h3 className="mb-3 text-sm font-medium text-slate-800">
        {t("modelExternalSection")}
      </h3>

      {empty && !formOpen ? (
        <p className="mb-6 text-sm text-slate-500">{t("modelExternalEmpty")}</p>
      ) : null}

      {!empty ? (
        <ul className="mb-6 divide-y divide-slate-200 rounded border border-slate-200">
          {config.providers.map((item) => {
            const active = item.id === config.activeProviderId
            const confirming = pendingDeleteId === item.id
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 px-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-900">
                      {displayProviderName(item)}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                      {PRESET_LABELS[item.preset]}
                    </span>
                    {active ? (
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-white">
                        {t("commonDefault")}
                      </span>
                    ) : null}
                  </div>
                  {item.selectedModelId ? (
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {item.selectedModelId}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {confirming ? (
                    <>
                      <button
                        type="button"
                        className="rounded px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                        onClick={() => void handleConfirmDelete(item.id)}>
                        {t("modelConfirmDelete")}
                      </button>
                      <button
                        type="button"
                        className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                        onClick={() => setPendingDeleteId(null)}>
                        {t("commonCancel")}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                        disabled={active}
                        onClick={() => void handleSetActive(item.id)}>
                        {t("modelSetDefault")}
                      </button>
                      <button
                        type="button"
                        className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                        onClick={() => openEdit(item.id)}>
                        {t("modelEdit")}
                      </button>
                      <button
                        type="button"
                        className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                        onClick={() => setPendingDeleteId(item.id)}>
                        {t("commonDelete")}
                      </button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      {formOpen ? (
        <form
          className="max-w-lg space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSave()
          }}>
          <h2 className="text-sm font-medium text-slate-800">
            {editingId ? t("modelFormEditTitle") : t("modelFormAddTitle")}
          </h2>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-600">
              {t("modelFormProviderLabel")}
            </span>
            <select
              className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-slate-500"
              value={form.preset}
              onChange={(event) =>
                setForm((prev) =>
                  applyPreset(event.target.value as CloudProviderPreset, prev)
                )
              }>
              <option value="deepseek">DeepSeek</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
              <option value="dashscope">通义千问</option>
              <option value="kimi">Kimi</option>
              <option value="zhipu">智谱</option>
              <option value="doubao">豆包</option>
              <option value="claude">Claude</option>
              <option value="grok">Grok</option>
              <option value="mistral">Mistral</option>
              <option value="groq">Groq</option>
              <option value="custom">{t("modelPresetCustom")}</option>
            </select>
          </label>
          {form.preset === "custom" ? (
            <label className="block">
              <span className="mb-1 block text-xs text-slate-600">
                {t("modelFormProviderNameLabel")}
              </span>
              <input
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </label>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-xs text-slate-600">Key</span>
            <input
              type="password"
              autoComplete="off"
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
              value={form.apiKey}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, apiKey: event.target.value }))
              }
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-600">
              {t("modelFormAddressLabel")}
            </span>
            <input
              readOnly={addressReadOnly}
              className={`w-full rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500 ${
                addressReadOnly ? "bg-slate-50 text-slate-500" : ""
              }`}
              placeholder="https://api.deepseek.com/v1"
              value={form.baseUrl}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, baseUrl: event.target.value }))
              }
            />
          </label>
          {listedIds.length > 0 ? (
            <label className="block">
              <span className="mb-1 block text-xs text-slate-600">
                {t("modelFormDefaultModelLabel")}
              </span>
              <select
                className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-slate-500"
                value={
                  listedIds.includes(form.selectedModelId)
                    ? form.selectedModelId
                    : ""
                }
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    selectedModelId: event.target.value
                  }))
                }>
                <option value="" disabled>
                  {t("modelFormPleaseSelect")}
                </option>
                {listedIds.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300">
              {t("commonSave")}
            </button>
            <button
              type="button"
              disabled={refreshing}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              onClick={() => void refreshListed(form)}>
              {t("modelRefreshModels")}
            </button>
            <button
              type="button"
              className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              onClick={closeForm}>
              {t("commonCancel")}
            </button>
          </div>
        </form>
      ) : null}

      <h3 className="mb-3 mt-8 text-sm font-medium text-slate-800">
        {t("modelBuiltinSection")}
      </h3>
      <ul className="divide-y divide-slate-200 rounded border border-slate-200">
        <li className="flex flex-wrap items-start justify-between gap-3 px-3 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium text-slate-900">
                Gemini Nano
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                {PRESET_LABELS["gemini-nano"]}
              </span>
              {nanoActive ? (
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-white">
                  {t("commonDefault")}
                </span>
              ) : null}
              {nanoReady ? (
                <button
                  type="button"
                  className="text-xs text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                  onClick={() => void handleUninstallNano()}>
                  {t("modelNanoUninstall")}
                </button>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-slate-500">{nanoStatusText}</p>
            {nanoReady ? (
              <p className="mt-1 text-xs text-slate-500">
                {t("modelNanoUninstallHint")}
              </p>
            ) : null}
            {nanoLoading && nanoPercent === 0 && (nanoWaitSeconds ?? 0) >= 15 ? (
              <p className="mt-1 text-xs text-amber-700">
                {t("modelNanoProgressHint")}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
              disabled={nanoActionsBusy}
              onClick={() => void handleCheckNanoStatus()}>
              {t("modelNanoCheckStatus")}
            </button>
            {nanoCanLoad ? (
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                disabled={nanoActionsBusy}
                onClick={() => void handleLoadNano()}>
                {t("modelNanoLoad")}
              </button>
            ) : null}
            {nanoShowReload ? (
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                disabled={nanoActionsBusy}
                onClick={() => void handleLoadNano()}>
                {t("modelNanoReload")}
              </button>
            ) : null}
            {nanoLoading ? (
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                onClick={handleStopNanoWait}>
                {t("modelNanoStopWaiting")}
              </button>
            ) : null}
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
              disabled={!nanoReady || nanoActive}
              onClick={() => void handleSetActive(LOCAL_GEMINI_NANO_ID)}>
              {t("modelSetDefault")}
            </button>
          </div>
        </li>
      </ul>
    </div>
  )
}
