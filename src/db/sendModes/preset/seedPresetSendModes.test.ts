import { afterEach, describe, expect, it } from "vitest"

import { DB_NAME } from "../../schema"
import {
  createLocalBrainDexie,
  type LocalBrainDexie
} from "../../drivers/indexeddb/dexieDb"
import { createSendModesRepository } from "../repository"
import type { SendModePresetCatalogEntry } from "./catalog"
import { seedPresetSendModes } from "./seedPresetSendModes"

const opened: LocalBrainDexie[] = []
let idSeq = 0

afterEach(async () => {
  while (opened.length > 0) {
    const db = opened.pop()
    db?.close()
  }
  indexedDB.deleteDatabase(DB_NAME)
  idSeq = 0
})

async function openRepo() {
  const db = createLocalBrainDexie()
  opened.push(db)
  await db.open()
  return createSendModesRepository(db)
}

function createId() {
  idSeq += 1
  return `id-${idSeq}`
}

const entry: SendModePresetCatalogEntry = {
  builtinId: "chat",
  version: "1.0.0",
  name: "正常对话",
  description: "请求大模型",
  callModel: true,
  autoSave: false,
  includeHistory: true,
  async: false
}

describe("seedPresetSendModes", () => {
  it("inserts when empty", async () => {
    const repo = await openRepo()
    const result = await seedPresetSendModes({
      entries: [entry],
      suppressedBuiltinIds: [],
      repo,
      createId,
      now: () => 1000
    })
    expect(result.inserted).toBe(1)
    const list = await repo.list()
    expect(list).toHaveLength(1)
    expect(list[0]?.origin).toBe("builtin")
    expect(list[0]?.builtinId).toBe("chat")
    expect(list[0]?.callModel).toBe(true)
  })

  it("skips suppressed builtins", async () => {
    const repo = await openRepo()
    const result = await seedPresetSendModes({
      entries: [entry],
      suppressedBuiltinIds: ["chat"],
      repo,
      createId,
      now: () => 1000
    })
    expect(result.skipped).toBe(1)
    expect(await repo.list()).toHaveLength(0)
  })

  it("overwrites in place on version bump", async () => {
    const repo = await openRepo()
    await seedPresetSendModes({
      entries: [entry],
      suppressedBuiltinIds: [],
      repo,
      createId,
      now: () => 1000
    })
    const result = await seedPresetSendModes({
      entries: [
        {
          ...entry,
          version: "1.1.0",
          name: "对话"
        }
      ],
      suppressedBuiltinIds: [],
      repo,
      createId,
      now: () => 2000
    })
    expect(result.updated).toBe(1)
    const list = await repo.list()
    expect(list).toHaveLength(1)
    expect(list[0]?.version).toBe("1.1.0")
    expect(list[0]?.name).toBe("对话")
    expect(list[0]?.id).toBe("id-1")
  })
})
