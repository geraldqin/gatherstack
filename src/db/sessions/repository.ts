import type { LocalBrainDexie } from "../drivers/indexeddb/dexieDb"
import { createLocalBrainDexie } from "../drivers/indexeddb/dexieDb"
import { MAX_SESSIONS } from "../schema"
import { t } from "~shared/i18n"
import { trimSession } from "./trimSession"
import type { ChatSession, ChatSessionInput } from "./types"

export type ChatSessionSummary = Pick<
  ChatSession,
  "id" | "title" | "createdAt" | "updatedAt"
>

export type CreateSessionResult = {
  session: ChatSession
  evictedOldest: boolean
}

export type SessionsRepository = {
  listSessions(): Promise<ChatSessionSummary[]>
  getSession(id: string): Promise<ChatSession | undefined>
  upsertSession(session: ChatSessionInput): Promise<void>
  deleteSession(id: string): Promise<void>
  createSession(): Promise<CreateSessionResult>
}

export function createSessionsRepository(
  db: LocalBrainDexie = createLocalBrainDexie()
): SessionsRepository {
  return {
    async listSessions(): Promise<ChatSessionSummary[]> {
      const sessions = await db.chatSessions.orderBy("updatedAt").reverse().toArray()
      return sessions.map(({ id, title, createdAt, updatedAt }) => ({
        id,
        title,
        createdAt,
        updatedAt
      }))
    },

    async getSession(id: string): Promise<ChatSession | undefined> {
      return db.chatSessions.get(id)
    },

    async upsertSession(session: ChatSessionInput): Promise<void> {
      const trimmed = trimSession(session)
      await db.chatSessions.put({
        ...trimmed,
        updatedAt: Date.now()
      })
    },

    async deleteSession(id: string): Promise<void> {
      await db.chatSessions.delete(id)
    },

    async createSession(): Promise<CreateSessionResult> {
      let evictedOldest = false
      const count = await db.chatSessions.count()
      if (count >= MAX_SESSIONS) {
        const oldest = await db.chatSessions.orderBy("updatedAt").first()
        if (oldest) {
          await db.chatSessions.delete(oldest.id)
          evictedOldest = true
        }
      }

      const now = Date.now()
      const session: ChatSession = {
        id: crypto.randomUUID(),
        title: t("sessionDefaultTitle"),
        createdAt: now,
        updatedAt: now,
        sessionModel: null,
        draftAttachment: null,
        draftSkill: null,
        sendMode: "chat",
        messages: []
      }

      await db.chatSessions.put(session)
      return { session, evictedOldest }
    }
  }
}
