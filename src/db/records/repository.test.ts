import { afterEach, describe, expect, it, vi } from "vitest"

import {
  createRecordsRepository,
  DB_NAME,
  openLocalBrainDb,
  type CollectedRecord,
  type LocalBrainDbHandle,
  type SyncSink
} from ".."

const sample: CollectedRecord = {
  id: "r1",
  createdAt: 1,
  sourceUrl: "https://example.com/",
  title: "Example",
  payload: "{}",
  skillId: "default"
}

const opened: LocalBrainDbHandle[] = []

afterEach(async () => {
  while (opened.length > 0) {
    const db = opened.pop()
    await db?.primary.close()
  }
  indexedDB.deleteDatabase(DB_NAME)
})

async function openRepo(syncSinks: SyncSink[] = []) {
  const db = await openLocalBrainDb({ syncSinks })
  opened.push(db)
  return createRecordsRepository(db)
}

describe("createRecordsRepository", () => {
  it("inserts, lists, gets, and deletes via IndexedDB", async () => {
    const repo = await openRepo()
    await repo.insert(sample)
    expect(await repo.getById(sample.id)).toEqual(sample)
    expect(await repo.list()).toEqual([sample])
    await repo.deleteById(sample.id)
    expect(await repo.getById(sample.id)).toBeUndefined()
    expect(await repo.list()).toEqual([])
  })

  it("writes primary even when a sync sink rejects", async () => {
    const sink: SyncSink = {
      kind: "mysql",
      upsert: vi.fn(async () => {
        throw new Error("bridge down")
      }),
      deleteById: vi.fn(async () => {
        throw new Error("bridge down")
      })
    }
    const repo = await openRepo([sink])
    await repo.insert(sample)
    expect(await repo.getById(sample.id)).toEqual(sample)
    expect(sink.upsert).toHaveBeenCalledWith(sample)
  })

  it("updates fields while preserving id and createdAt", async () => {
    const sink: SyncSink = {
      kind: "mysql",
      upsert: vi.fn(async () => undefined),
      deleteById: vi.fn(async () => undefined)
    }
    const repo = await openRepo([sink])
    await repo.insert(sample)
    const updated: CollectedRecord = {
      ...sample,
      title: "Updated",
      sourceUrl: "https://example.com/x",
      payload: '{\n  "a": 1\n}',
      skillId: ""
    }
    await repo.update(updated)
    expect(await repo.getById(sample.id)).toEqual(updated)
    expect(sink.upsert).toHaveBeenLastCalledWith(updated)
  })
})
