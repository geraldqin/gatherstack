import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent
} from "react"

import type { DraftSkill, PageAttachment } from "~shared/chatMessages"
import {
  probeGeminiNanoAvailability,
  type GeminiNanoAvailability
} from "~shared/geminiNano"
import {
  displayProviderName,
  excludeUnavailableGeminiNano,
  findProviderById,
  listAllSessionModelOptions,
  loadModelConfig,
  LOCAL_GEMINI_NANO_ID,
  parseSessionModelOptionKey,
  resolveSessionModelOptionKey,
  sessionModelOptionKey,
  sessionModelOptionsFromConfig,
  subscribeModelConfig,
  type ModelConfig,
  type SessionModelOption
} from "~shared/modelConfig"
import {
  defaultExpandedProviderId,
  groupSessionModelsByProvider
} from "~shared/sessionModelGroups"
import { stripModelsResourcePrefix } from "~shared/listProviderModels"
import { t } from "~shared/i18n"
import { openOptions } from "~shared/openOptions"
import {
  colorKeyForModeId,
  normalizeSendMode,
  resolveOption,
  sendModeLabel,
  sendModeMenuAccentClass,
  sendModeMenuOptionClass,
  sendModePickerTriggerClass,
  sendModePrimaryButtonClass,
  type SendModeId,
  type SendModeOption
} from "~shared/sendMode"

import { AsyncStopDialog } from "./asyncParse/AsyncStopDialog"
import type { AsyncParseJobRunnerSnapshot } from "./asyncParse/types"
import { isOneClickCollectUx } from "./oneClickCollect/flags"
import { canDirectStore } from "./canDirectStore"
import { PageAttachmentChip } from "./PageAttachmentChip"
import { SkillChip } from "./SkillChip"
import {
  applySkillSelection,
  detectSlashSkillTrigger,
  filterSkillsByQuery
} from "./slashSkillTrigger"

export type SessionModelSelection = {
  providerId: string
  modelId: string
}

export type SkillListItem = DraftSkill

type ChatInputProps = {
  onSend: (
    text: string,
    selection: SessionModelSelection | null,
    attachment: PageAttachment | null,
    skill: DraftSkill | null
  ) => void
  onStop: () => void
  onReadPage: () => void
  isStreaming: boolean
  attachment: PageAttachment | null
  onRemoveAttachment: () => void
  onAttachmentChange?: (next: PageAttachment) => void
  onLoadOriginal?: () => Promise<string | null>
  isLoadOriginalPending?: boolean
  loadOriginalError?: string | null
  draftSkill: DraftSkill | null
  onSelectSkill: (skill: DraftSkill) => void
  onRemoveSkill: () => void
  skills: SkillListItem[]
  isReading: boolean
  readError: string | null
  selection?: SessionModelSelection | null
  onSelectionChange?: (selection: SessionModelSelection | null) => void
  sendMode: SendModeId
  sendModeOptions: SendModeOption[]
  onSendModeChange: (mode: SendModeId) => void
  onSendModeOptionsRefresh?: () => void
  onDirectStore: (
    text: string,
    attachment: PageAttachment | null,
    skill: DraftSkill | null
  ) => void | Promise<void>
  isDirectStoring?: boolean
  asyncSnapshot?: AsyncParseJobRunnerSnapshot
  onCancelAsyncJobs?: (jobIds: string[]) => void
}

function ModelPicker({
  options,
  selectedKey,
  onSelect,
  disabled,
  placeholder,
  onOpen
}: {
  options: SessionModelOption[]
  selectedKey: string | null
  onSelect: (key: string) => void
  disabled: boolean
  placeholder: string
  onOpen?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const rootRef = useRef<HTMLDivElement>(null)
  const hasModels = options.length > 0
  const selected = options.find((item) => item.key === selectedKey)
  const label = selected
    ? selected.modelId
    : selectedKey
      ? (parseSessionModelOptionKey(selectedKey)?.modelId ??
        (hasModels ? t("modelSelectModel") : placeholder))
      : hasModels
        ? t("modelSelectModel")
        : placeholder
  const groups = useMemo(() => groupSessionModelsByProvider(options), [options])

  useEffect(() => {
    if (!open) {
      return
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  function toggleOpen() {
    if (open) {
      setOpen(false)
      return
    }
    const initial = defaultExpandedProviderId(groups, selected)
    setExpandedIds(initial ? new Set([initial]) : new Set())
    setOpen(true)
    onOpen?.()
  }

  function toggleGroup(providerId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(providerId)) {
        next.delete(providerId)
      } else {
        next.add(providerId)
      }
      return next
    })
  }

  return (
    <div ref={rootRef} className="relative max-w-[10rem]">
      <button
        type="button"
        disabled={disabled || !hasModels}
        title={
          selected
            ? `${selected.providerLabel} · ${selected.modelId}`
            : undefined
        }
        className="flex w-full items-center truncate rounded border border-slate-200 bg-white px-1.5 py-1 text-left text-xs text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        onClick={toggleOpen}>
        {label}
      </button>
      {open && hasModels ? (
        <ul className="absolute bottom-full left-0 z-20 mb-1 max-h-52 min-w-[12rem] overflow-y-auto rounded border border-slate-200 bg-white py-1 shadow-md">
          {groups.map((group) => {
            const expanded = expandedIds.has(group.providerId)
            return (
              <li key={group.providerId}>
                <button
                  type="button"
                  className="flex w-full items-center gap-1 px-2 py-1 text-left text-[10px] font-medium text-slate-500 hover:bg-slate-50"
                  onClick={() => toggleGroup(group.providerId)}
                  aria-expanded={expanded}>
                  <span className="w-2 shrink-0 text-slate-400" aria-hidden>
                    {expanded ? "▾" : "▸"}
                  </span>
                  <span className="truncate">{group.providerLabel}</span>
                </button>
                {expanded ? (
                  <ul>
                    {group.options.map((option) => {
                      const active = option.key === selectedKey
                      return (
                        <li key={option.key}>
                          <button
                            type="button"
                            className={`block w-full truncate px-2 py-1 pl-5 text-left text-xs hover:bg-slate-100 ${
                              active
                                ? "font-medium text-slate-900"
                                : "text-slate-700"
                            }`}
                            onClick={() => {
                              onSelect(option.key)
                              setOpen(false)
                            }}>
                            {option.modelId}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

function SendModePicker({
  mode,
  options,
  onChange,
  disabled,
  onOpen
}: {
  mode: SendModeId
  options: SendModeOption[]
  onChange: (mode: SendModeId) => void
  disabled: boolean
  onOpen?: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const label = sendModeLabel(mode, options)
  const modeAria = t("sendModeWithLabelAria", [label])
  const colorKey = colorKeyForModeId(mode, options)

  useEffect(() => {
    if (!open) {
      return
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  function toggleOpen() {
    if (disabled) {
      return
    }
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    onOpen?.()
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        aria-label={modeAria}
        title={modeAria}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex h-7 w-7 items-center justify-center rounded ${sendModePickerTriggerClass(colorKey)}`}
        onClick={toggleOpen}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      </button>
      {open ? (
        <div className="absolute bottom-full right-0 z-40 mb-1 w-52 overflow-hidden rounded border border-slate-200 bg-white shadow-md">
          <ul role="listbox" aria-label={t("sendModePickerAria")} className="py-1">
            {options.map((option) => {
              const selected = option.id === mode
              const optionColor = colorKeyForModeId(option.id, [option])
              return (
                <li key={option.id} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    className={`block w-full px-3 py-2 text-left ${sendModeMenuOptionClass(optionColor, selected)}`}
                    onClick={() => {
                      onChange(option.id)
                      setOpen(false)
                    }}>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-medium ${
                          selected
                            ? sendModeMenuAccentClass(optionColor)
                            : "text-slate-800"
                        }`}>
                        {option.label}
                      </span>
                      {selected ? (
                        <span
                          className={`text-xs ${sendModeMenuAccentClass(optionColor)}`}>
                          ✓
                        </span>
                      ) : null}
                    </div>
                    {option.description ? (
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {option.description}
                      </div>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="border-t border-slate-100 px-3 py-2">
            <button
              type="button"
              className="text-left text-[11px] text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
              onClick={() => {
                setOpen(false)
                openOptions({
                  nav: "settings",
                  settingsSection: "send-mode"
                })
              }}>
              {t("sendModeOpenSettingsLink")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function resolveControlledOptionKey(
  options: SessionModelOption[],
  selection: SessionModelSelection | null
): string | null {
  if (!selection) {
    return null
  }
  const key = sessionModelOptionKey(
    selection.providerId,
    stripModelsResourcePrefix(selection.modelId)
  )
  return options.some((item) => item.key === key) ? key : null
}

function ensureSelectionInOptions(
  options: SessionModelOption[],
  selection: SessionModelSelection | null,
  config: ModelConfig
): SessionModelOption[] {
  if (!selection) {
    return options
  }
  const modelId = stripModelsResourcePrefix(selection.modelId)
  const key = sessionModelOptionKey(selection.providerId, modelId)
  if (options.some((item) => item.key === key)) {
    return options
  }
  const provider = findProviderById(config, selection.providerId)
  return [
    ...options,
    {
      key,
      providerId: selection.providerId,
      modelId,
      providerLabel: provider
        ? displayProviderName(provider)
        : selection.providerId
    }
  ]
}

export function ChatInput({
  onSend,
  onStop,
  onReadPage,
  isStreaming,
  attachment,
  onRemoveAttachment,
  onAttachmentChange,
  onLoadOriginal,
  isLoadOriginalPending,
  loadOriginalError,
  draftSkill,
  onSelectSkill,
  onRemoveSkill,
  skills,
  isReading,
  readError,
  selection: controlledSelection,
  onSelectionChange,
  sendMode,
  sendModeOptions,
  onSendModeChange,
  onSendModeOptionsRefresh,
  onDirectStore,
  isDirectStoring = false,
  asyncSnapshot,
  onCancelAsyncJobs
}: ChatInputProps) {
  const isControlled = onSelectionChange != null
  const [value, setValue] = useState("")
  const [options, setOptions] = useState<SessionModelOption[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [placeholder, setPlaceholder] = useState(() => t("modelNeedProvider"))
  const [slashOpen, setSlashOpen] = useState(false)
  const [stopDialogOpen, setStopDialogOpen] = useState(false)
  const selectedKeyRef = useRef<string | null>(null)
  const refreshFullOptionsRef = useRef<() => void>(() => {})
  const inputRootRef = useRef<HTMLDivElement>(null)
  const modeId = normalizeSendMode(sendMode)
  const modeOption = resolveOption(modeId, sendModeOptions)
  const colorKey = colorKeyForModeId(modeId, sendModeOptions)
  const isDirectStoreMode = !modeOption.callModel
  const isAsyncMode = modeOption.async
  const isOneClickArmed = isOneClickCollectUx(modeOption)
  const hasContent = value.trim().length > 0 || attachment != null
  const canSendChat = hasContent && !isStreaming
  const canSendAsync = hasContent
  const canStore =
    canDirectStore({
      text: value,
      attachment,
      skill: draftSkill,
      isStreaming
    }) && !isDirectStoring
  const canPrimary = isDirectStoreMode
    ? canStore
    : isAsyncMode
      ? canSendAsync
      : canSendChat
  const asyncJobCount =
    (asyncSnapshot?.queued.length ?? 0) + (asyncSnapshot?.running.length ?? 0)
  const showAsyncQueue = asyncJobCount > 0 && asyncSnapshot != null
  selectedKeyRef.current = selectedKey

  const slashTrigger = useMemo(() => detectSlashSkillTrigger(value), [value])
  const filteredSkills = useMemo(
    () =>
      slashTrigger
        ? filterSkillsByQuery(skills, slashTrigger.query)
        : [],
    [skills, slashTrigger]
  )

  useEffect(() => {
    setSlashOpen(slashTrigger != null)
  }, [slashTrigger])

  useEffect(() => {
    if (!slashOpen) {
      return
    }

    function onPointerDown(event: MouseEvent) {
      if (!inputRootRef.current?.contains(event.target as Node)) {
        setSlashOpen(false)
      }
    }

    document.addEventListener("mousedown", onPointerDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
    }
  }, [slashOpen])

  const displayKey = useMemo(() => {
    if (!isControlled) {
      return selectedKey
    }
    if (controlledSelection) {
      const resolved = resolveControlledOptionKey(options, controlledSelection)
      if (resolved) {
        return resolved
      }
      // Do not ghost-show Nano when it was filtered out as unavailable.
      if (
        controlledSelection.providerId === LOCAL_GEMINI_NANO_ID &&
        !options.some((item) => item.providerId === LOCAL_GEMINI_NANO_ID)
      ) {
        return null
      }
      // Show persisted session selection before options hydrate / if not in list yet.
      return sessionModelOptionKey(
        controlledSelection.providerId,
        stripModelsResourcePrefix(controlledSelection.modelId)
      )
    }
    return null
  }, [controlledSelection, isControlled, options, selectedKey])

  useEffect(() => {
    let cancelled = false
    let seq = 0
    const configRef = { current: null as ModelConfig | null }
    const nanoAvailabilityRef = {
      current: "available" as GeminiNanoAvailability
    }

    function applyOptions(
      config: ModelConfig,
      nextOptions: SessionModelOption[],
      prevSelected: string | null
    ) {
      const filtered = excludeUnavailableGeminiNano(
        nextOptions,
        nanoAvailabilityRef.current
      )
      const nanoBlocked =
        controlledSelection?.providerId === LOCAL_GEMINI_NANO_ID &&
        !filtered.some((item) => item.providerId === LOCAL_GEMINI_NANO_ID)
      const withSelection = nanoBlocked
        ? filtered
        : ensureSelectionInOptions(
            filtered,
            isControlled ? (controlledSelection ?? null) : null,
            config
          )
      if (withSelection.length === 0) {
        setOptions([])
        if (isControlled) {
          if (!controlledSelection || nanoBlocked) {
            onSelectionChange?.(null)
          }
        } else {
          setSelectedKey(null)
        }
        setPlaceholder(t("modelNeedProvider"))
        return
      }
      setOptions(withSelection)
      if (isControlled) {
        if (controlledSelection && !nanoBlocked) {
          return
        }
        const key = resolveSessionModelOptionKey(
          withSelection,
          config,
          prevSelected
        )
        const option = withSelection.find((item) => item.key === key)
        onSelectionChange?.(
          option
            ? { providerId: option.providerId, modelId: option.modelId }
            : null
        )
      } else {
        setSelectedKey(
          resolveSessionModelOptionKey(withSelection, config, prevSelected)
        )
      }
      setPlaceholder(t("modelNeedProvider"))
    }

    function applyConfig(config: ModelConfig, prevSelected: string | null) {
      configRef.current = config
      const token = ++seq
      // Use saved defaults immediately — do not fetch provider model lists on open.
      const nextOptions = sessionModelOptionsFromConfig(config)
      if (cancelled || token !== seq) {
        return
      }
      applyOptions(config, nextOptions, prevSelected)
    }

    async function refreshFullOptions() {
      const config = configRef.current
      if (!config) {
        return
      }
      const token = ++seq
      nanoAvailabilityRef.current = await probeGeminiNanoAvailability()
      if (cancelled || token !== seq) {
        return
      }
      const nextOptions = await listAllSessionModelOptions(config)
      if (cancelled || token !== seq) {
        return
      }
      applyOptions(config, nextOptions, selectedKeyRef.current)
    }

    void (async () => {
      nanoAvailabilityRef.current = await probeGeminiNanoAvailability()
      if (cancelled) {
        return
      }
      const result = await loadModelConfig()
      if (cancelled) {
        return
      }
      applyConfig(result.config, null)
    })()

    const unsubscribe = subscribeModelConfig((config) => {
      applyConfig(config, selectedKeyRef.current)
    })

    refreshFullOptionsRef.current = () => {
      void refreshFullOptions()
    }

    return () => {
      cancelled = true
      unsubscribe()
      refreshFullOptionsRef.current = () => {}
    }
  }, [controlledSelection, isControlled, onSelectionChange])

  function pickSkill(skill: SkillListItem) {
    const trigger = detectSlashSkillTrigger(value)
    if (trigger) {
      setValue(applySkillSelection(value, trigger))
    }
    onSelectSkill(skill)
    setSlashOpen(false)
  }

  function resolveSendSelection(): SessionModelSelection | null {
    if (isControlled) {
      return controlledSelection ?? null
    }
    const selected = options.find((item) => item.key === selectedKey)
    return selected
      ? { providerId: selected.providerId, modelId: selected.modelId }
      : null
  }

  function handleSend() {
    const text = value.trim()
    if (!text && !attachment) {
      return
    }
    if (!isAsyncMode && isStreaming) {
      return
    }
    onSend(text, resolveSendSelection(), attachment, draftSkill)
    const keepDraft = isOneClickCollectUx(modeOption)
    if (!keepDraft) {
      setValue("")
    }
  }

  async function handleDirectStore() {
    if (!canStore) {
      return
    }
    const text = value.trim()
    try {
      await Promise.resolve(onDirectStore(text, attachment, draftSkill))
      setValue("")
    } catch {
      // keep textarea value on failure
    }
  }

  function handlePrimaryAction() {
    if (isDirectStoreMode) {
      void handleDirectStore()
      return
    }
    handleSend()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) {
      return
    }
    if (e.key === "Escape" && slashOpen) {
      e.preventDefault()
      setSlashOpen(false)
      return
    }
    if (e.key !== "Enter") {
      return
    }
    if (e.shiftKey) {
      return
    }
    if (!isAsyncMode && isStreaming) {
      return
    }
    if (slashOpen && filteredSkills[0]) {
      e.preventDefault()
      pickSkill(filteredSkills[0])
      return
    }
    e.preventDefault()
    handlePrimaryAction()
  }

  const showChips = attachment != null || draftSkill != null

  return (
    <footer className="shrink-0 border-t border-slate-200 p-3">
      {showAsyncQueue ? (
        <div
          role="status"
          className="mb-2 flex items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
          <span>
            {t("asyncParseQueueStatus", [
              String(asyncSnapshot.running.length),
              String(asyncSnapshot.maxConcurrent),
              String(asyncSnapshot.queued.length)
            ])}
          </span>
          {onCancelAsyncJobs ? (
            <button
              type="button"
              className="shrink-0 rounded px-1.5 py-0.5 text-slate-700 hover:bg-slate-200"
              onClick={() => setStopDialogOpen(true)}>
              {t("asyncParseStopButton")}
            </button>
          ) : null}
        </div>
      ) : null}
      {stopDialogOpen && asyncSnapshot && onCancelAsyncJobs ? (
        <AsyncStopDialog
          snapshot={asyncSnapshot}
          onClose={() => setStopDialogOpen(false)}
          onConfirm={(ids) => {
            onCancelAsyncJobs(ids)
          }}
        />
      ) : null}
      <div
        ref={inputRootRef}
        className="relative overflow-visible rounded border border-slate-300 focus-within:border-slate-500">
        {showChips ? (
          <div className="flex flex-wrap gap-1.5 px-2 pt-2">
            {attachment ? (
              <PageAttachmentChip
                attachment={attachment}
                onRemove={onRemoveAttachment}
                onAttachmentChange={onAttachmentChange}
                onLoadOriginal={onLoadOriginal}
                isLoadOriginalPending={isLoadOriginalPending}
                loadOriginalError={loadOriginalError}
              />
            ) : null}
            {draftSkill ? (
              <SkillChip
                name={draftSkill.name}
                skillId={draftSkill.id}
                onRemove={onRemoveSkill}
              />
            ) : null}
          </div>
        ) : null}
        {slashOpen ? (
          <ul className="absolute bottom-full left-0 right-0 z-30 mb-1 max-h-48 overflow-y-auto rounded border border-slate-200 bg-white py-1 shadow-md">
            {skills.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-500">
                {t("sidepanelNoSkillsHint")}
              </li>
            ) : filteredSkills.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-500">
                {t("sidepanelNoSkillMatch")}
              </li>
            ) : (
              filteredSkills.map((skill) => (
                <li key={skill.id}>
                  <button
                    type="button"
                    className="block w-full truncate px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                    onClick={() => pickSkill(skill)}>
                    {skill.name}
                  </button>
                </li>
              ))
            )}
            {skills.length > 0 ? (
              <li className="border-t border-slate-100 px-3 py-1.5 text-[11px] leading-snug text-slate-400">
                {t("sidepanelSingleSkillHint")}
              </li>
            ) : null}
          </ul>
        ) : null}
        <textarea
          className="max-h-32 min-h-[2.5rem] w-full resize-none border-0 bg-transparent px-2 py-1.5 text-left text-sm outline-none"
          rows={2}
          placeholder={t("sidepanelInputPlaceholder")}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="relative shrink-0">
              {isOneClickArmed ? (
                <span
                  className="mpm-autocast-ring pointer-events-none absolute -inset-[2px] z-20"
                  aria-hidden="true"
                />
              ) : null}
              <button
                type="button"
                disabled={isReading}
                title={
                  isOneClickArmed
                    ? t("sidepanelReadPageArmedTitle")
                    : undefined
                }
                className={`relative z-10 shrink-0 rounded px-1.5 py-1 text-xs disabled:cursor-not-allowed disabled:text-slate-400 ${
                  isOneClickArmed
                    ? "mpm-autocast-armed bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900 disabled:bg-slate-100 disabled:shadow-none"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
                onClick={onReadPage}>
                {isReading ? t("sidepanelReadingPage") : t("sidepanelReadPage")}
              </button>
            </div>
            <ModelPicker
              options={options}
              selectedKey={displayKey}
              onSelect={(key) => {
                const option = options.find((item) => item.key === key)
                if (!option) {
                  return
                }
                if (isControlled) {
                  onSelectionChange?.({
                    providerId: option.providerId,
                    modelId: option.modelId
                  })
                } else {
                  setSelectedKey(key)
                }
              }}
              disabled={options.length === 0}
              placeholder={placeholder}
              onOpen={() => {
                refreshFullOptionsRef.current()
              }}
            />
          </div>
          {isStreaming && !isAsyncMode ? (
            <button
              type="button"
              className="shrink-0 rounded bg-slate-800 px-3 py-1 text-xs text-white hover:bg-slate-700"
              onClick={onStop}>
              {t("sidepanelStop")}
            </button>
          ) : (
            <div className="flex shrink-0 items-center gap-1.5">
              <SendModePicker
                mode={modeId}
                options={sendModeOptions}
                onChange={onSendModeChange}
                disabled={isDirectStoring}
                onOpen={onSendModeOptionsRefresh}
              />
              <button
                type="button"
                disabled={!canPrimary}
                aria-label={
                  isDirectStoreMode
                    ? isDirectStoring
                      ? t("commonSavingShort")
                      : modeOption.label
                    : isAsyncMode
                      ? modeOption.label
                      : t("sidepanelSend")
                }
                title={
                  isDirectStoreMode
                    ? isDirectStoring
                      ? t("commonSaving")
                      : modeOption.label
                    : isAsyncMode
                      ? modeOption.label
                      : t("sidepanelSend")
                }
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${sendModePrimaryButtonClass(colorKey)}`}
                onClick={handlePrimaryAction}>
                {isDirectStoreMode ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`h-3.5 w-3.5 ${
                      isDirectStoring ? "animate-pulse" : ""
                    }`}
                    aria-hidden="true">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true">
                    <path d="M12 19V5" />
                    <path d="M5 12l7-7 7 7" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
        {readError ? (
          <p
            className="truncate px-2 pb-2 text-xs text-slate-500"
            title={readError}>
            {readError}
          </p>
        ) : null}
      </div>
    </footer>
  )
}
