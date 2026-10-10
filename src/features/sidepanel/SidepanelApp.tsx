import { useEffect, useRef, useState } from "react"

import {
  createRecordsRepository,
  createSendModesRepository,
  createSessionsRepository,
  createSkillsRepository,
  getActiveSessionId,
  openLocalBrainDb,
  runSendModePresetSeed,
  runSkillPresetSeed,
  setActiveSessionId,
  titleFromMessages,
  type ChatSession,
  type ChatSessionInput,
  type ChatSessionSummary,
  type CollectedRecord,
  type CollectedRecordRepository,
  type LocalBrainDbHandle,
  type SendModeDocument,
  type SessionsRepository,
  type SkillDocument
} from "~db"
import { createLocalBrainDexie } from "~db/drivers/indexeddb/dexieDb"
import { DEFAULT_MAX_CONCURRENT } from "~db/sendModes/normalize"
import {
  buildSendMessages,
  type ChatMessage,
  type DraftSkill,
  type PageAttachment
} from "~shared/chatMessages"
import { collectedRecordsToAttachment } from "~shared/collectedRecordAttachment"
import {
  streamGeminiNano,
  type StreamGeminiNanoResult
} from "~shared/geminiNano"
import {
  findProviderById,
  isLocalGeminiNano,
  loadModelConfig
} from "~shared/modelConfig"
import {
  consumePendingDraftAttachment,
  PENDING_DRAFT_ATTACHMENT_KEY,
  setPendingDraftAttachment,
  subscribePendingDraftAttachment
} from "~shared/pendingDraftAttachment"
import { readActiveTabDom } from "~shared/readActiveTabDom"
import { readActiveTabOuterHtml } from "~shared/readActiveTabOuterHtml"
import { streamChatCompletions } from "~shared/streamChatCompletions"
import { stripModelsResourcePrefix } from "~shared/listProviderModels"
import {
  DEFAULT_SEND_MODE,
  resolveSendModeDocument,
  sendModeDocumentsToOptions,
  sendModePersistId,
  type SendModeId
} from "~shared/sendMode"
import { t } from "~shared/i18n"
import {
  buildDirectStoreRecord,
  getRecordBuilderForMessage
} from "~skills"

import { buildAsyncParseMessagesFromSkill } from "./asyncParse/buildAsyncParseMessages"
import { createAsyncParseJobRunner } from "./asyncParse/jobRunner"
import type {
  AsyncParseJob,
  AsyncParseJobRunnerSnapshot
} from "./asyncParse/types"
import { canDirectStore } from "./canDirectStore"
import { canSaveMessage } from "./canSaveMessage"
import { ChatInput, type SessionModelSelection } from "./ChatInput"
import { MessageList } from "./MessageList"
import { isOneClickCollectUx } from "./oneClickCollect/flags"
import { patchChatMessageList } from "./patchChatMessage"
import {
  attachmentFromReadResult,
  decideAttachOnSelect,
  decideAttachOnSend,
  resolveRefreshAttachment
} from "./oneClickCollect/pageAttach"
import {
  applyLoadOriginal,
  resolveLoadOriginalAfterAwait
} from "./pageAttachmentActions"
import { SidepanelHeader } from "./SidepanelHeader"

async function queryActiveTabUrl(): Promise<string | undefined> {
  const [current] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  })
  if (current?.url) {
    return current.url
  }
  const [last] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true
  })
  return last?.url
}

const FLUSH_DEBOUNCE_MS = 300
const NOTICE_MS = 3000

function resolveStreamFailureMessage(
  result: Extract<StreamGeminiNanoResult, { ok: false }>
): string {
  if ("error" in result) {
    if (result.error === "unsupported") {
      return t("modelNanoUnsupported")
    }
    if (result.error === "need-download") {
      return t("modelNanoNeedDownload")
    }
  }
  if ("message" in result && typeof result.message === "string") {
    const trimmed = result.message.trim()
    if (trimmed) {
      return trimmed
    }
  }
  return t("sidepanelRequestFailed")
}

function hydrateMessages(session: ChatSession): ChatMessage[] {
  return session.messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    ...(message.status ? { status: message.status } : {}),
    ...(message.errorMessage ? { errorMessage: message.errorMessage } : {}),
    ...(message.attachment
      ? { attachment: { url: message.attachment.url } }
      : {}),
    ...(message.skillId ? { skillId: message.skillId } : {}),
    ...(message.skillName ? { skillName: message.skillName } : {}),
    ...(message.savedRecordId
      ? { savedRecordId: message.savedRecordId }
      : {})
  }))
}

function hydrateDraft(
  draft: ChatSession["draftAttachment"]
): PageAttachment | null {
  return draft ? { url: draft.url } : null
}

function hydrateDraftSkill(
  draft: ChatSession["draftSkill"]
): DraftSkill | null {
  return draft
    ? { id: draft.id, name: draft.name, markdown: draft.markdown }
    : null
}

export function SidepanelApp() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionModel, setSessionModel] = useState<SessionModelSelection | null>(
    null
  )
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isDirectStoring, setIsDirectStoring] = useState(false)
  const [draftAttachment, setDraftAttachment] = useState<PageAttachment | null>(
    null
  )
  const [draftSkill, setDraftSkill] = useState<DraftSkill | null>(null)
  const [sendMode, setSendMode] = useState<SendModeId>(DEFAULT_SEND_MODE)
  const [sendModeDocs, setSendModeDocs] = useState<SendModeDocument[]>([])
  const [suppressAutoPageAttach, setSuppressAutoPageAttach] = useState(false)
  const [skills, setSkills] = useState<SkillDocument[]>([])
  const [isReading, setIsReading] = useState(false)
  const [readError, setReadError] = useState<string | null>(null)
  const [isLoadOriginalPending, setIsLoadOriginalPending] = useState(false)
  const [loadOriginalError, setLoadOriginalError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [asyncSnapshot, setAsyncSnapshot] = useState<AsyncParseJobRunnerSnapshot>(
    () => ({
      queued: [],
      running: [],
      maxConcurrent: 5
    })
  )

  const streamingRef = useRef(false)
  const asyncEnqueueInFlightRef = useRef(false)
  const directStoringRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const asyncRunnerRef = useRef(createAsyncParseJobRunner())
  const messagesRef = useRef<ChatMessage[]>([])
  const readingRef = useRef(false)
  const dbRef = useRef<LocalBrainDbHandle | null>(null)
  const repoRef = useRef<CollectedRecordRepository | null>(null)
  const sessionsRepoRef = useRef<SessionsRepository | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const sessionCreatedAtRef = useRef(0)
  const sessionModelRef = useRef<SessionModelSelection | null>(null)
  const draftAttachmentRef = useRef<PageAttachment | null>(null)
  const draftSkillRef = useRef<DraftSkill | null>(null)
  const sendModeRef = useRef<SendModeId>(DEFAULT_SEND_MODE)
  const sendModeDocsRef = useRef<SendModeDocument[]>([])
  const suppressAutoPageAttachRef = useRef(false)
  const hydratedRef = useRef(false)
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const switchingRef = useRef(false)
  const queuedPendingRecordIdsRef = useRef<string[] | null>(null)
  const loadRecordsAsDraftRef = useRef<(recordIds: string[]) => Promise<void>>(
    async () => {}
  )
  const loadOriginalGenRef = useRef(0)

  sessionIdRef.current = sessionId
  sessionModelRef.current = sessionModel
  draftAttachmentRef.current = draftAttachment
  draftSkillRef.current = draftSkill
  sendModeRef.current = sendMode
  sendModeDocsRef.current = sendModeDocs
  suppressAutoPageAttachRef.current = suppressAutoPageAttach

  function bumpLoadOriginalGeneration() {
    loadOriginalGenRef.current += 1
  }

  function invalidateLoadOriginalInFlight() {
    bumpLoadOriginalGeneration()
    setLoadOriginalError(null)
    setIsLoadOriginalPending(false)
  }

  function showNotice(message: string) {
    if (noticeTimerRef.current != null) {
      clearTimeout(noticeTimerRef.current)
      noticeTimerRef.current = null
    }
    setNotice(message)
    noticeTimerRef.current = setTimeout(() => {
      noticeTimerRef.current = null
      setNotice(null)
    }, NOTICE_MS)
  }

  function normalizeSessionModel(
    model: SessionModelSelection | null
  ): SessionModelSelection | null {
    if (!model) {
      return null
    }
    return {
      providerId: model.providerId,
      modelId: stripModelsResourcePrefix(model.modelId)
    }
  }

  function applySessionState(session: ChatSession) {
    const nextMessages = hydrateMessages(session)
    const nextModel = normalizeSessionModel(session.sessionModel)
    messagesRef.current = nextMessages
    sessionIdRef.current = session.id
    sessionCreatedAtRef.current = session.createdAt
    sessionModelRef.current = nextModel
    draftAttachmentRef.current = hydrateDraft(session.draftAttachment)
    draftSkillRef.current = hydrateDraftSkill(session.draftSkill)
    const resolved = resolveSendModeDocument(
      sendModeDocsRef.current,
      session.sendMode
    )
    sendModeRef.current = sendModePersistId(resolved)
    suppressAutoPageAttachRef.current = session.suppressAutoPageAttach === true
    setSessionId(session.id)
    setSessionModel(nextModel)
    setMessages(nextMessages)
    setDraftAttachment(draftAttachmentRef.current)
    setDraftSkill(draftSkillRef.current)
    setSendMode(sendModeRef.current)
    setSuppressAutoPageAttach(suppressAutoPageAttachRef.current)
    setReadError(null)
    invalidateLoadOriginalInFlight()
    if (resolved.async) {
      asyncRunnerRef.current.setMaxConcurrent(
        resolved.maxConcurrent ?? DEFAULT_MAX_CONCURRENT
      )
      syncAsyncSnapshot()
    }
  }

  function buildCurrentSession(): ChatSessionInput | null {
    const id = sessionIdRef.current
    if (!id) {
      return null
    }
    return {
      id,
      title: titleFromMessages(messagesRef.current),
      createdAt: sessionCreatedAtRef.current || Date.now(),
      updatedAt: Date.now(),
      sessionModel: sessionModelRef.current,
      draftAttachment: draftAttachmentRef.current,
      draftSkill: draftSkillRef.current,
      sendMode: sendModeRef.current,
      suppressAutoPageAttach: suppressAutoPageAttachRef.current,
      messages: messagesRef.current
    }
  }

  async function refreshSessionsList(): Promise<ChatSessionSummary[]> {
    const repo = sessionsRepoRef.current
    if (!repo) {
      return []
    }
    const list = await repo.listSessions()
    setSessions(list)
    return list
  }

  async function flushSession(): Promise<void> {
    const repo = sessionsRepoRef.current
    const session = buildCurrentSession()
    if (!repo || !session || !hydratedRef.current) {
      return
    }
    await repo.upsertSession(session)
    await refreshSessionsList()
  }

  function clearFlushTimer() {
    if (flushTimerRef.current != null) {
      clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }
  }

  function scheduleFlush() {
    if (!hydratedRef.current || switchingRef.current) {
      return
    }
    clearFlushTimer()
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null
      void flushSession()
    }, FLUSH_DEBOUNCE_MS)
  }

  function abortStreamingIfNeeded() {
    if (streamingRef.current) {
      abortRef.current?.abort()
      finishStreaming()
    }
  }

  function cancelAsyncForSession(sessionId: string | null) {
    if (!sessionId) {
      return
    }
    const { abortedAssistantIds } =
      asyncRunnerRef.current.cancelSession(sessionId)
    for (const assistantId of abortedAssistantIds) {
      patchMessage(assistantId, { status: "stopped" })
    }
  }

  function syncAsyncSnapshot() {
    setAsyncSnapshot(asyncRunnerRef.current.getSnapshot())
  }

  function pumpAsyncJobs() {
    const runner = asyncRunnerRef.current
    while (true) {
      const job = runner.takeNextToStart()
      if (!job) {
        break
      }
      void runAsyncParseJob(job)
    }
    syncAsyncSnapshot()
  }

  async function runAsyncParseJob(job: AsyncParseJob) {
    const runner = asyncRunnerRef.current
    const userId = crypto.randomUUID()
    const assistantId = crypto.randomUUID()
    const skillFields = job.skill
      ? { skillId: job.skill.id, skillName: job.skill.name }
      : {}
    const next: ChatMessage[] = [
      ...messagesRef.current,
      {
        id: userId,
        role: "user",
        content: job.text,
        ...(job.attachment ? { attachment: job.attachment } : {}),
        ...skillFields
      },
      {
        id: assistantId,
        role: "assistant",
        content: "",
        status: "streaming",
        ...skillFields
      }
    ]
    messagesRef.current = next
    setMessages(next)
    runner.markRunningIds(job.id, userId, assistantId)
    syncAsyncSnapshot()

    const controller = runner.getAbortController(job.id)
    const loaded = await loadModelConfig()
    const provider = findProviderById(loaded.config, job.selection.providerId)
    const modelId = stripModelsResourcePrefix(job.selection.modelId)
    if (!provider || !modelId) {
      patchMessage(assistantId, {
        status: "error",
        errorMessage: t("modelNeedProvider")
      })
      runner.finish(job.id)
      syncAsyncSnapshot()
      pumpAsyncJobs()
      return
    }

    if (controller?.signal.aborted) {
      patchMessage(assistantId, { status: "stopped" })
      runner.finish(job.id)
      syncAsyncSnapshot()
      pumpAsyncJobs()
      return
    }

    const apiMessages = buildAsyncParseMessagesFromSkill({
      text: job.text,
      attachment: job.attachment,
      skill: job.skill
    })
    const onDelta = (delta: string) => {
      const withDelta = messagesRef.current.map((item) =>
        item.id === assistantId
          ? { ...item, content: item.content + delta }
          : item
      )
      messagesRef.current = withDelta
      setMessages(withDelta)
    }

    const result = isLocalGeminiNano(provider)
      ? await streamGeminiNano({
          messages: apiMessages,
          signal: controller!.signal,
          onDelta
        })
      : await streamChatCompletions({
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          model: modelId,
          messages: apiMessages,
          signal: controller!.signal,
          onDelta
        })

    runner.finish(job.id)
    syncAsyncSnapshot()

    if (result.ok && result.reason === "aborted") {
      patchMessage(assistantId, { status: "stopped" })
      pumpAsyncJobs()
      return
    }
    if (result.ok) {
      patchMessage(assistantId, { status: "complete" })
      if (job.autoSave) {
        await tryAutoSaveMessage(assistantId)
      }
      pumpAsyncJobs()
      return
    }
    patchMessage(assistantId, {
      status: "error",
      errorMessage: resolveStreamFailureMessage(result)
    })
    pumpAsyncJobs()
  }

  async function handleAsyncParseSend(
    text: string,
    selection: SessionModelSelection | null,
    attachment: PageAttachment | null,
    skill: DraftSkill | null,
    flags: { autoSave: boolean; maxConcurrent: number }
  ) {
    // Short lock only across resolve+enqueue so a double-click during URL
    // refresh cannot enqueue twice; released before jobs run so intentional
    // multi-send still works.
    if (asyncEnqueueInFlightRef.current) {
      return
    }
    asyncEnqueueInFlightRef.current = true
    try {
      const modeDoc = resolveSendModeDocument(
        sendModeDocsRef.current,
        sendModeRef.current
      )
      const resolvedAttachment = await resolveAttachmentForSend(
        attachment,
        modeDoc
      )
      if (!text && !resolvedAttachment) {
        return
      }
      const currentSessionId = sessionIdRef.current
      if (!currentSessionId) {
        return
      }
      if (!selection?.providerId || !selection.modelId) {
        setReadError(t("modelNeedProvider"))
        return
      }
      const loaded = await loadModelConfig()
      const provider = findProviderById(loaded.config, selection.providerId)
      const modelId = stripModelsResourcePrefix(selection.modelId)
      if (!provider || !modelId) {
        setReadError(t("modelNeedProvider"))
        return
      }

      setReadError(null)
      invalidateLoadOriginalInFlight()
      asyncRunnerRef.current.setMaxConcurrent(flags.maxConcurrent)
      asyncRunnerRef.current.enqueue({
        id: crypto.randomUUID(),
        sessionId: currentSessionId,
        createdAt: Date.now(),
        text,
        attachment: resolvedAttachment,
        skill,
        selection: { providerId: selection.providerId, modelId },
        autoSave: flags.autoSave,
        maxConcurrent: flags.maxConcurrent
      })
      const keepDraft = isOneClickCollectUx(modeDoc)
      if (!keepDraft) {
        setDraftAttachment(null)
        draftAttachmentRef.current = null
        setDraftSkill(null)
        draftSkillRef.current = null
      }
      syncAsyncSnapshot()
      pumpAsyncJobs()
    } finally {
      asyncEnqueueInFlightRef.current = false
    }
  }

  function handleCancelAsyncJobs(jobIds: string[]) {
    if (jobIds.length === 0) {
      return
    }
    const { abortedAssistantIds } = asyncRunnerRef.current.cancel(jobIds)
    for (const assistantId of abortedAssistantIds) {
      patchMessage(assistantId, { status: "stopped" })
    }
    syncAsyncSnapshot()
    pumpAsyncJobs()
  }

  function handleStopMessage(message: ChatMessage) {
    if (message.role !== "assistant" || message.status !== "streaming") {
      return
    }
    const job = asyncRunnerRef.current.findByAssistantMessageId(message.id)
    if (job) {
      handleCancelAsyncJobs([job.id])
      return
    }
    abortRef.current?.abort()
  }

  useEffect(() => {
    const runner = asyncRunnerRef.current
    const unsub = runner.subscribe(() => {
      setAsyncSnapshot(runner.getSnapshot())
    })
    return () => {
      unsub()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const unsubPending = subscribePendingDraftAttachment((recordIds) => {
      if (cancelled) {
        return
      }
      void chrome.storage.session.remove(PENDING_DRAFT_ATTACHMENT_KEY)
      void loadRecordsAsDraftRef.current(recordIds)
    })

    async function applyQueuedOrConsumedPending() {
      const queued = queuedPendingRecordIdsRef.current
      queuedPendingRecordIdsRef.current = null
      const consumed = await consumePendingDraftAttachment()
      const recordIds = queued ?? consumed
      if (!recordIds) {
        return
      }
      if (cancelled) {
        await setPendingDraftAttachment(recordIds)
        return
      }
      await loadRecordsAsDraftRef.current(recordIds)
    }

    async function boot() {
      const dexie = createLocalBrainDexie()
      const sessionsRepo = createSessionsRepository(dexie)
      sessionsRepoRef.current = sessionsRepo

      try {
        await runSkillPresetSeed(dexie)
        await runSendModePresetSeed(dexie)
        const [skillDocs, modeDocs] = await Promise.all([
          createSkillsRepository(dexie).list(),
          createSendModesRepository(dexie).list()
        ])
        if (!cancelled) {
          setSkills(skillDocs)
          sendModeDocsRef.current = modeDocs
          setSendModeDocs(modeDocs)
        }
      } catch {
        if (!cancelled) {
          setSkills([])
          setSendModeDocs([])
        }
      }

      const activeId = await getActiveSessionId()
      let session = activeId ? await sessionsRepo.getSession(activeId) : undefined
      if (!session) {
        const created = await sessionsRepo.createSession()
        session = created.session
        await setActiveSessionId(session.id)
        if (created.evictedOldest) {
          showNotice(t("sidepanelSessionEvicted"))
        }
      }

      if (cancelled) {
        return
      }

      applySessionState(session)
      await refreshSessionsList()
      hydratedRef.current = true
      await applyQueuedOrConsumedPending()
    }

    void boot()

    function flushNow() {
      clearFlushTimer()
      void flushSession()
    }

    function onPageHide() {
      flushNow()
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flushNow()
      }
    }

    window.addEventListener("pagehide", onPageHide)
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      cancelled = true
      unsubPending()
      clearFlushTimer()
      if (noticeTimerRef.current != null) {
        clearTimeout(noticeTimerRef.current)
        noticeTimerRef.current = null
      }
      window.removeEventListener("pagehide", onPageHide)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [])

  useEffect(() => {
    scheduleFlush()
  }, [
    messages,
    sessionModel,
    draftAttachment,
    draftSkill,
    sendMode,
    suppressAutoPageAttach
  ])

  function patchMessage(id: string, patch: Partial<ChatMessage>) {
    // Sync ref before setState so tryAutoSaveMessage (right after stream) sees
    // status: complete — updater-only writes can still be "streaming".
    const next = patchChatMessageList(messagesRef.current, id, patch)
    messagesRef.current = next
    setMessages(next)
  }

  function finishStreaming() {
    streamingRef.current = false
    setIsStreaming(false)
    abortRef.current = null
  }

  async function ensureRecordsRepository(): Promise<CollectedRecordRepository> {
    if (repoRef.current) {
      return repoRef.current
    }
    const db = await openLocalBrainDb()
    dbRef.current = db
    const repo = createRecordsRepository(db)
    repoRef.current = repo
    return repo
  }

  loadRecordsAsDraftRef.current = async (recordIds: string[]) => {
    if (!hydratedRef.current) {
      queuedPendingRecordIdsRef.current = recordIds
      return
    }
    try {
      const repo = await ensureRecordsRepository()
      const records: CollectedRecord[] = []
      for (const id of recordIds) {
        const record = await repo.getById(id)
        if (record) {
          records.push(record)
        }
      }
      const next = collectedRecordsToAttachment(records)
      if (!next) {
        setReadError(t("sidepanelExportDataNotFound"))
        return
      }
      draftAttachmentRef.current = next
      setDraftAttachment(next)
      setReadError(null)
      invalidateLoadOriginalInFlight()
    } catch {
      setReadError(t("sidepanelExportToSidepanelFailed"))
    }
  }

  async function tryAutoSaveMessage(messageId: string): Promise<void> {
    const message = messagesRef.current.find((m) => m.id === messageId)
    if (!message || message.savedRecordId || !canSaveMessage(message)) {
      return
    }
    try {
      const repo = await ensureRecordsRepository()
      const record = getRecordBuilderForMessage(message).buildRecord({
        message,
        messages: messagesRef.current
      })
      await repo.insert(record)
      patchMessage(messageId, { savedRecordId: record.id })
    } catch {
      showNotice(t("commonSaveFailed"))
    }
  }

  async function handleSaveMessage(message: ChatMessage): Promise<void> {
    const repo = await ensureRecordsRepository()
    const record = getRecordBuilderForMessage(message).buildRecord({
      message,
      messages: messagesRef.current
    })
    await repo.insert(record)
    patchMessage(message.id, { savedRecordId: record.id })
  }

  async function handleDirectStore(
    text: string,
    attachment: PageAttachment | null,
    skill: DraftSkill | null
  ) {
    if (directStoringRef.current || streamingRef.current) {
      throw new Error(t("commonSavingShort"))
    }
    if (!canDirectStore({ text, attachment, skill, isStreaming: false })) {
      throw new Error(t("sidepanelDirectStoreCannotSave"))
    }
    directStoringRef.current = true
    setIsDirectStoring(true)
    setReadError(null)
    invalidateLoadOriginalInFlight()
    try {
      const skillFields = skill
        ? { skillId: skill.id, skillName: skill.name }
        : {}
      const message: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        ...(attachment ? { attachment } : {}),
        ...skillFields
      }
      const { record, usedJsonPayload } = buildDirectStoreRecord(message)
      const repo = await ensureRecordsRepository()
      await repo.insert(record)
      const savedMessage: ChatMessage = {
        ...message,
        savedRecordId: record.id
      }
      const next = [...messagesRef.current, savedMessage]
      messagesRef.current = next
      setMessages(next)
      setDraftAttachment(null)
      draftAttachmentRef.current = null
      setDraftSkill(null)
      draftSkillRef.current = null
      if (skill && !usedJsonPayload && text.trim()) {
        setReadError(t("sidepanelDirectStoreNotJson"))
      }
    } catch {
      setReadError(t("commonSaveFailed"))
      throw new Error(t("commonSaveFailed"))
    } finally {
      directStoringRef.current = false
      setIsDirectStoring(false)
    }
  }

  async function handleSelectSession(id: string) {
    if (
      !sessionsRepoRef.current ||
      id === sessionIdRef.current ||
      switchingRef.current
    ) {
      return
    }
    switchingRef.current = true
    try {
      clearFlushTimer()
      const leavingId = sessionIdRef.current
      cancelAsyncForSession(leavingId)
      abortStreamingIfNeeded()
      await flushSession()
      await setActiveSessionId(id)
      const session = await sessionsRepoRef.current.getSession(id)
      if (session) {
        applySessionState(session)
      }
      await refreshSessionsList()
    } finally {
      switchingRef.current = false
    }
  }

  async function handleCreateSession() {
    if (!sessionsRepoRef.current || switchingRef.current) {
      return
    }
    switchingRef.current = true
    try {
      clearFlushTimer()
      cancelAsyncForSession(sessionIdRef.current)
      abortStreamingIfNeeded()
      await flushSession()
      const created = await sessionsRepoRef.current.createSession()
      await setActiveSessionId(created.session.id)
      applySessionState(created.session)
      await refreshSessionsList()
      if (created.evictedOldest) {
        showNotice(t("sidepanelSessionEvicted"))
      }
    } finally {
      switchingRef.current = false
    }
  }

  async function handleDeleteSession() {
    const repo = sessionsRepoRef.current
    const id = sessionIdRef.current
    if (!repo || !id || switchingRef.current) {
      return
    }
    switchingRef.current = true
    try {
      clearFlushTimer()
      cancelAsyncForSession(id)
      abortStreamingIfNeeded()
      hydratedRef.current = false
      await repo.deleteSession(id)
      let list = await repo.listSessions()
      let next = list[0]
      if (!next) {
        const created = await repo.createSession()
        next = {
          id: created.session.id,
          title: created.session.title,
          createdAt: created.session.createdAt,
          updatedAt: created.session.updatedAt
        }
        list = await repo.listSessions()
      }
      await setActiveSessionId(next.id)
      applySessionState(
        (await repo.getSession(next.id)) ?? {
          ...next,
          sessionModel: null,
          draftAttachment: null,
          draftSkill: null,
          sendMode: DEFAULT_SEND_MODE,
          messages: []
        }
      )
      setSessions(list)
      hydratedRef.current = true
    } finally {
      switchingRef.current = false
    }
  }

  async function handleSend(
    text: string,
    selection: SessionModelSelection | null,
    attachment: PageAttachment | null,
    skill: DraftSkill | null
  ) {
    if (streamingRef.current) {
      return
    }
    // Lock before await resolveAttachmentForSend so a double-click during DOM
    // refresh cannot start two sync streams.
    streamingRef.current = true
    setIsStreaming(true)
    try {
      const modeDoc = resolveSendModeDocument(
        sendModeDocsRef.current,
        sendModeRef.current
      )
      const resolvedAttachment = await resolveAttachmentForSend(
        attachment,
        modeDoc
      )
      if (!text && !resolvedAttachment) {
        finishStreaming()
        return
      }
      const includeHistory = modeDoc.includeHistory
      const autoSave = modeDoc.autoSave
      const keepDraft = isOneClickCollectUx(modeDoc)
      const controller = new AbortController()
      abortRef.current = controller
      if (!keepDraft) {
        setDraftAttachment(null)
        draftAttachmentRef.current = null
        setDraftSkill(null)
        draftSkillRef.current = null
      }
      setReadError(null)
      invalidateLoadOriginalInFlight()

      const skillFields = skill
        ? { skillId: skill.id, skillName: skill.name }
        : {}
      const assistantId = crypto.randomUUID()
      const next: ChatMessage[] = [
        ...messagesRef.current,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: text,
          ...(resolvedAttachment ? { attachment: resolvedAttachment } : {}),
          ...skillFields
        },
        {
          id: assistantId,
          role: "assistant",
          content: "",
          status: "streaming",
          ...skillFields
        }
      ]
      messagesRef.current = next
      setMessages(next)

      const loaded = await loadModelConfig()
      const provider = selection
        ? findProviderById(loaded.config, selection.providerId)
        : null
      const modelId = selection?.modelId
        ? stripModelsResourcePrefix(selection.modelId)
        : null
      if (!provider || !modelId) {
        finishStreaming()
        patchMessage(assistantId, {
          status: "error",
          errorMessage: t("modelNeedProvider")
        })
        return
      }

      if (controller.signal.aborted) {
        finishStreaming()
        patchMessage(assistantId, { status: "stopped" })
        return
      }

      const apiMessages = buildSendMessages(next, {
        ...(skill ? { skillMarkdown: skill.markdown } : {}),
        includeHistory: includeHistory
      })
      const onDelta = (delta: string) => {
        const withDelta = messagesRef.current.map((item) =>
          item.id === assistantId
            ? { ...item, content: item.content + delta }
            : item
        )
        messagesRef.current = withDelta
        setMessages(withDelta)
      }
      const result = isLocalGeminiNano(provider)
        ? await streamGeminiNano({
            messages: apiMessages,
            signal: controller.signal,
            onDelta
          })
        : await streamChatCompletions({
            baseUrl: provider.baseUrl,
            apiKey: provider.apiKey,
            model: modelId,
            messages: apiMessages,
            signal: controller.signal,
            onDelta
          })

      finishStreaming()

      if (result.ok && result.reason === "aborted") {
        patchMessage(assistantId, { status: "stopped" })
        return
      }
      if (result.ok) {
        patchMessage(assistantId, { status: "complete" })
        if (autoSave) {
          await tryAutoSaveMessage(assistantId)
        }
        return
      }
      patchMessage(assistantId, {
        status: "error",
        errorMessage: resolveStreamFailureMessage(result)
      })
    } finally {
      if (streamingRef.current) {
        finishStreaming()
      }
    }
  }

  function handleStop() {
    abortRef.current?.abort()
  }

  function handleDraftAttachmentChange(next: PageAttachment) {
    draftAttachmentRef.current = next
    setDraftAttachment(next)
    setLoadOriginalError(null)
  }

  async function handleLoadOriginalFromDraft(): Promise<string | null> {
    const current = draftAttachmentRef.current
    if (!current || current.kind === "record") {
      return null
    }
    bumpLoadOriginalGeneration()
    const gen = loadOriginalGenRef.current
    setIsLoadOriginalPending(true)
    setLoadOriginalError(null)
    try {
      const result = await readActiveTabOuterHtml()
      const decision = resolveLoadOriginalAfterAwait({
        startedGen: gen,
        currentGen: loadOriginalGenRef.current,
        draft: draftAttachmentRef.current
      })
      if (!decision.apply) {
        return null
      }
      const latest = draftAttachmentRef.current
      if (!latest) {
        return null
      }
      const applied = applyLoadOriginal(latest, result)
      if (applied.errorMessage) {
        setLoadOriginalError(applied.errorMessage)
        return applied.errorMessage
      }
      if (!applied.next) {
        return null
      }
      draftAttachmentRef.current = applied.next
      setDraftAttachment(applied.next)
      return null
    } finally {
      if (gen === loadOriginalGenRef.current) {
        setIsLoadOriginalPending(false)
      }
    }
  }

  async function handleReadPage() {
    if (readingRef.current) {
      return
    }
    readingRef.current = true
    setIsReading(true)
    setReadError(null)
    invalidateLoadOriginalInFlight()
    try {
      const result = await readActiveTabDom()
      if (result.ok) {
        const next: PageAttachment = {
          url: result.url,
          markdown: result.markdown,
          ...(result.title ? { title: result.title } : {})
        }
        draftAttachmentRef.current = next
        setDraftAttachment(next)
        return
      }
      setReadError(result.errorMessage)
    } finally {
      readingRef.current = false
      setIsReading(false)
    }
  }

  async function resolveAttachmentForSend(
    attachment: PageAttachment | null,
    modeDoc: SendModeDocument
  ): Promise<PageAttachment | null> {
    if (!isOneClickCollectUx(modeDoc)) {
      return attachment
    }
    const activeTabUrl = await queryActiveTabUrl()
    const decision = decideAttachOnSend({
      attachment,
      activeTabUrl
    })
    if (decision.action === "none" || decision.action === "keep") {
      return attachment
    }
    const result = await readActiveTabDom()
    if (!attachment) {
      return null
    }
    const next = resolveRefreshAttachment({
      previous: attachment,
      result,
      activeTabUrl
    })
    setDraftAttachment(next)
    draftAttachmentRef.current = next
    return next
  }

  async function attachCurrentPageForOneClickCollect(): Promise<void> {
    const result = await readActiveTabDom()
    if (!result.ok) {
      // Do not stamp chrome-extension:// or other failed tabs as empty attachments.
      setReadError(result.errorMessage)
      return
    }
    const next = attachmentFromReadResult(result, result.url)
    draftAttachmentRef.current = next
    setDraftAttachment(next)
    invalidateLoadOriginalInFlight()
  }

  async function refreshSendModeDocs(): Promise<void> {
    try {
      const modeDocs = await createSendModesRepository(
        createLocalBrainDexie()
      ).list()
      sendModeDocsRef.current = modeDocs
      setSendModeDocs(modeDocs)
    } catch {
      // keep existing list
    }
  }

  async function handleSendModeChange(mode: SendModeId): Promise<void> {
    const docs = sendModeDocsRef.current
    const prevDoc = resolveSendModeDocument(docs, sendModeRef.current)
    const nextDoc = resolveSendModeDocument(docs, mode)
    const nextUx = isOneClickCollectUx(nextDoc)
    const prevUx = isOneClickCollectUx(prevDoc)

    if (nextUx) {
      if (!prevUx) {
        suppressAutoPageAttachRef.current = false
        setSuppressAutoPageAttach(false)
      }
      const decision = decideAttachOnSelect({
        hasAttachment: draftAttachmentRef.current != null,
        suppressAutoPageAttach: suppressAutoPageAttachRef.current
      })
      if (decision.action === "read") {
        await attachCurrentPageForOneClickCollect()
      }
    }

    const persistId = sendModePersistId(nextDoc)
    sendModeRef.current = persistId
    setSendMode(persistId)
    if (nextDoc.async) {
      asyncRunnerRef.current.setMaxConcurrent(
        nextDoc.maxConcurrent ?? DEFAULT_MAX_CONCURRENT
      )
      syncAsyncSnapshot()
    }
  }

  function handleRemoveAttachment() {
    draftAttachmentRef.current = null
    setDraftAttachment(null)
    invalidateLoadOriginalInFlight()
    const modeDoc = resolveSendModeDocument(
      sendModeDocsRef.current,
      sendModeRef.current
    )
    if (isOneClickCollectUx(modeDoc)) {
      suppressAutoPageAttachRef.current = true
      setSuppressAutoPageAttach(true)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-white text-slate-800">
      <SidepanelHeader
        sessions={sessions}
        activeSessionId={sessionId}
        onSelectSession={(id) => {
          void handleSelectSession(id)
        }}
        onCreateSession={() => {
          void handleCreateSession()
        }}
        onDeleteSession={() => {
          void handleDeleteSession()
        }}
      />
      {notice ? (
        <div
          role="status"
          className="shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
          {notice}
        </div>
      ) : null}
      <MessageList
        messages={messages}
        onSaveMessage={handleSaveMessage}
        onStopMessage={handleStopMessage}
      />
      <ChatInput
        key={sessionId ?? "boot"}
        onSend={(text, selection, attachment, skill) => {
          const modeDoc = resolveSendModeDocument(
            sendModeDocsRef.current,
            sendModeRef.current
          )
          if (!modeDoc.callModel) {
            return
          }
          if (modeDoc.async) {
            void handleAsyncParseSend(text, selection, attachment, skill, {
              autoSave: modeDoc.autoSave,
              maxConcurrent: modeDoc.maxConcurrent ?? DEFAULT_MAX_CONCURRENT
            })
            return
          }
          void handleSend(text, selection, attachment, skill)
        }}
        onStop={handleStop}
        onReadPage={() => {
          void handleReadPage()
        }}
        isStreaming={isStreaming}
        attachment={draftAttachment}
        onRemoveAttachment={handleRemoveAttachment}
        onAttachmentChange={handleDraftAttachmentChange}
        onLoadOriginal={handleLoadOriginalFromDraft}
        isLoadOriginalPending={isLoadOriginalPending}
        loadOriginalError={loadOriginalError}
        draftSkill={draftSkill}
        onSelectSkill={(skill) => {
          draftSkillRef.current = skill
          setDraftSkill(skill)
        }}
        onRemoveSkill={() => {
          draftSkillRef.current = null
          setDraftSkill(null)
        }}
        skills={skills.map((item) => ({
          id: item.id,
          name: item.name,
          markdown: item.markdown
        }))}
        isReading={isReading}
        readError={readError}
        selection={sessionModel}
        onSelectionChange={setSessionModel}
        sendMode={sendMode}
        sendModeOptions={sendModeDocumentsToOptions(sendModeDocs)}
        onSendModeChange={(mode) => {
          void handleSendModeChange(mode)
        }}
        onSendModeOptionsRefresh={() => {
          void refreshSendModeDocs()
        }}
        onDirectStore={handleDirectStore}
        isDirectStoring={isDirectStoring}
        asyncSnapshot={asyncSnapshot}
        onCancelAsyncJobs={handleCancelAsyncJobs}
      />
    </div>
  )
}
