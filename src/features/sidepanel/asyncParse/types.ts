import type { DraftSkill, PageAttachment } from "~shared/chatMessages"

export type AsyncParseModelSelection = {
  providerId: string
  modelId: string
}

export type AsyncParseJob = {
  id: string
  sessionId: string
  createdAt: number
  phase: "queued" | "running"
  text: string
  attachment: PageAttachment | null
  skill: DraftSkill | null
  selection: AsyncParseModelSelection
  /** Snapshot of send-mode flags at enqueue time */
  autoSave: boolean
  maxConcurrent: number
  userMessageId?: string
  assistantMessageId?: string
}

export type AsyncParseJobRunnerSnapshot = {
  queued: AsyncParseJob[]
  running: AsyncParseJob[]
  maxConcurrent: number
}

export type AsyncParseJobEnqueueInput = Omit<
  AsyncParseJob,
  "phase" | "userMessageId" | "assistantMessageId"
>

export type AsyncParseJobRunner = {
  getSnapshot(): AsyncParseJobRunnerSnapshot
  setMaxConcurrent(n: number): void
  enqueue(job: AsyncParseJobEnqueueInput): AsyncParseJob
  takeNextToStart(): AsyncParseJob | null
  markRunningIds(
    jobId: string,
    userMessageId: string,
    assistantMessageId: string
  ): void
  finish(jobId: string): void
  cancel(jobIds: string[]): { abortedAssistantIds: string[] }
  cancelSession(sessionId: string): { abortedAssistantIds: string[] }
  findByAssistantMessageId(id: string): AsyncParseJob | undefined
  getAbortController(jobId: string): AbortController | undefined
  subscribe(listener: () => void): () => void
}
