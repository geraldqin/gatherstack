export type PersistedPageRef = {
  url: string
}

export type PageRefInput = PersistedPageRef & {
  html?: string
  markdown?: string
}

export type PersistedDraftSkill = {
  id: string
  name: string
  markdown: string
}

export type PersistedChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  status?: "streaming" | "complete" | "stopped" | "error"
  errorMessage?: string
  attachment?: PersistedPageRef
  skillId?: string
  skillName?: string
  savedRecordId?: string
}

export type ChatMessageInput = Omit<PersistedChatMessage, "attachment"> & {
  attachment?: PageRefInput
}

export type ChatSessionSendMode = string

export type ChatSession = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  sessionModel: { providerId: string; modelId: string } | null
  draftAttachment: PersistedPageRef | null
  draftSkill: PersistedDraftSkill | null
  /** Mode id or builtinId short name. Omitted on legacy sessions → chat. */
  sendMode?: ChatSessionSendMode
  /**
   * When true, selecting one-click-collect UX does not auto-attach the page.
   * Cleared when switching from a non-one-click UX back into one-click UX.
   * Omitted / undefined on legacy sessions → false.
   */
  suppressAutoPageAttach?: boolean
  messages: PersistedChatMessage[]
}

export type ChatSessionInput = Omit<
  ChatSession,
  "draftAttachment" | "draftSkill" | "messages"
> & {
  draftAttachment: PageRefInput | null
  draftSkill: PersistedDraftSkill | null
  messages: ChatMessageInput[]
}
