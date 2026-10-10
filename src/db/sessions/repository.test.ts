import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DB_NAME } from "../schema"
import { createLocalBrainDexie, type LocalBrainDexie } from "../drivers/indexeddb/dexieDb"
import { createSessionsRepository } from "./repository"
import type { ChatSessionInput } from "./types"

const opened: LocalBrainDexie[] = []

afterEach(async () => {
  while (opened.length > 0) {
    const db = opened.pop()
    db?.close()
  }
  indexedDB.deleteDatabase(DB_NAME)
})

function baseSession(overrides: Partial<ChatSessionInput> = {}): ChatSessionInput {
  return {
    id: "session-1",
    title: "旧标题",
    createdAt: 100,
    updatedAt: 200,
    sessionModel: null,
    draftAttachment: null,
    draftSkill: null,
    messages: [],
    ...overrides
  }
}

async function openRepo() {
  const db = createLocalBrainDexie()
  opened.push(db)
  await db.open()
  return createSessionsRepository(db)
}

describe("createSessionsRepository", () => {
  it("upserts then gets a session", async () => {
    const repo = await openRepo()
    const session = baseSession({
      messages: [{ id: "m1", role: "user", content: "hello" }]
    })

    await repo.upsertSession(session)
    const stored = await repo.getSession(session.id)

    expect(stored?.messages).toEqual([{ id: "m1", role: "user", content: "hello" }])
    expect(stored?.title).toBe("hello")
  })

  it("lists sessions by updatedAt descending", async () => {
    const repo = await openRepo()
    const db = opened[opened.length - 1]!

    for (const [id, updatedAt] of [
      ["a", 100],
      ["b", 300],
      ["c", 200]
    ] as const) {
      await db.chatSessions.put({
        id,
        title: id,
        createdAt: updatedAt,
        updatedAt,
        sessionModel: null,
        draftAttachment: null,
        draftSkill: null,
        messages: []
      })
    }

    const list = await repo.listSessions()
    expect(list.map((item) => item.id)).toEqual(["b", "c", "a"])
    expect(list.every((item) => !("messages" in item))).toBe(true)
  })

  it("trims html from attachments on upsert", async () => {
    const repo = await openRepo()
    await repo.upsertSession(
      baseSession({
        draftAttachment: { url: "https://draft.example", html: "<p>x</p>" },
        messages: [
          {
            id: "m1",
            role: "user",
            content: "hi",
            attachment: { url: "https://msg.example", html: "<body>y</body>" }
          }
        ]
      })
    )

    const stored = await repo.getSession("session-1")
    expect(stored?.draftAttachment).toEqual({ url: "https://draft.example" })
    expect(stored?.messages[0]?.attachment).toEqual({ url: "https://msg.example" })
  })

  it("persists sendMode and suppressAutoPageAttach on upsert", async () => {
    const repo = await openRepo()
    await repo.upsertSession(
      baseSession({
        sendMode: "oneClickCollect",
        suppressAutoPageAttach: true,
        messages: [{ id: "m1", role: "user", content: "hi" }]
      })
    )

    const stored = await repo.getSession("session-1")
    expect(stored?.sendMode).toBe("oneClickCollect")
    expect(stored?.suppressAutoPageAttach).toBe(true)
  })

  it("creates an empty session", async () => {
    const repo = await openRepo()
    const result = await repo.createSession()

    expect(result.evictedOldest).toBe(false)
    expect(result.session.messages).toEqual([])
    expect(result.session.title).toBe("对话")
    expect(await repo.getSession(result.session.id)).toEqual(result.session)
  })

  it("deletes the oldest session when creating beyond MAX_SESSIONS", async () => {
    const repo = await openRepo()
    const db = opened[opened.length - 1]!

    for (let index = 0; index < 30; index += 1) {
      await db.chatSessions.put({
        id: `s${index}`,
        title: `t${index}`,
        createdAt: index,
        updatedAt: index,
        sessionModel: null,
        draftAttachment: null,
        draftSkill: null,
        messages: []
      })
    }

    const result = await repo.createSession()
    const ids = (await repo.listSessions()).map((item) => item.id)

    expect(result.evictedOldest).toBe(true)
    expect(ids).toHaveLength(30)
    expect(ids).not.toContain("s0")
    expect(ids).toContain(result.session.id)
  })

  it("deletes a session by id", async () => {
    const repo = await openRepo()
    await repo.upsertSession(baseSession({ id: "gone" }))

    await repo.deleteSession("gone")

    expect(await repo.getSession("gone")).toBeUndefined()
    expect(await repo.listSessions()).toEqual([])
  })
})

describe("activeSession", () => {
  const storage = new Map<string, unknown>()

  beforeEach(() => {
    storage.clear()
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: vi.fn(async (key: string) => {
            const value = storage.get(key)
            return value !== undefined ? { [key]: value } : {}
          }),
          set: vi.fn(async (items: Record<string, unknown>) => {
            for (const [key, value] of Object.entries(items)) {
              storage.set(key, value)
            }
          }),
          remove: vi.fn(async (key: string | string[]) => {
            const keys = Array.isArray(key) ? key : [key]
            for (const item of keys) {
              storage.delete(item)
            }
          })
        }
      }
    })
  })

  it("reads and writes the active session id", async () => {
    const { getActiveSessionId, setActiveSessionId, ACTIVE_SESSION_ID_KEY } =
      await import("./activeSession")

    expect(ACTIVE_SESSION_ID_KEY).toBe("local-brain-db.activeSessionId")
    expect(await getActiveSessionId()).toBeNull()

    await setActiveSessionId("session-abc")
    expect(await getActiveSessionId()).toBe("session-abc")

    await setActiveSessionId(null)
    expect(await getActiveSessionId()).toBeNull()
    expect(storage.has(ACTIVE_SESSION_ID_KEY)).toBe(false)
  })
})
