import { afterEach, describe, expect, it } from "vitest"

import { DB_NAME } from "../../schema"
import {
  createLocalBrainDexie,
  type LocalBrainDexie
} from "../../drivers/indexeddb/dexieDb"
import { createSkillsRepository } from "../repository"
import { seedPresetSkills } from "./seedPresetSkills"

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
  return createSkillsRepository(db)
}

function createId() {
  idSeq += 1
  return `id-${idSeq}`
}

const entry = {
  builtinId: "rent-compare-collect",
  version: "1.0.0",
  markdown: "---\nname: 租房对比采集\n---\nbody-v1\n"
}

describe("seedPresetSkills", () => {
  it("inserts when empty", async () => {
    const repo = await openRepo()
    const result = await seedPresetSkills({
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
    expect(list[0]?.builtinId).toBe("rent-compare-collect")
    expect(list[0]?.filename).toBe("租房对比采集.md")
  })

  it("overwrites in place on version bump", async () => {
    const repo = await openRepo()
    await seedPresetSkills({
      entries: [entry],
      suppressedBuiltinIds: [],
      repo,
      createId,
      now: () => 1000
    })
    const result = await seedPresetSkills({
      entries: [
        {
          ...entry,
          version: "1.1.0",
          markdown: "---\nname: 租房对比采集\n---\nbody-v2\n"
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
    expect(list[0]?.markdown).toContain("body-v2")
  })

  it("dedupes extra builtin rows for the same builtinId", async () => {
    const repo = await openRepo()
    await seedPresetSkills({
      entries: [entry],
      suppressedBuiltinIds: [],
      repo,
      createId,
      now: () => 1000
    })
    const existing = (await repo.list())[0]!
    await repo.upsert({
      ...existing,
      id: "extra-id",
      updatedAt: 500,
      markdown: "---\nname: 租房对比采集\n---\nstale\n"
    })

    const result = await seedPresetSkills({
      entries: [
        {
          ...entry,
          version: "1.1.0",
          markdown: "---\nname: 租房对比采集\n---\nbody-v2\n"
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
    expect(list[0]?.id).toBe(existing.id)
    expect(list[0]?.markdown).toContain("body-v2")
  })

  it("skips suppressed builtinIds", async () => {
    const repo = await openRepo()
    const result = await seedPresetSkills({
      entries: [entry],
      suppressedBuiltinIds: ["rent-compare-collect"],
      repo,
      createId
    })
    expect(result.skipped).toBe(1)
    expect(await repo.list()).toEqual([])
  })

  it("is idempotent for same version", async () => {
    const repo = await openRepo()
    await seedPresetSkills({
      entries: [entry],
      suppressedBuiltinIds: [],
      repo,
      createId,
      now: () => 1000
    })
    const result = await seedPresetSkills({
      entries: [entry],
      suppressedBuiltinIds: [],
      repo,
      createId,
      now: () => 2000
    })
    expect(result.skipped).toBe(1)
    expect(result.inserted).toBe(0)
    expect(result.updated).toBe(0)
    expect(await repo.list()).toHaveLength(1)
  })
})
