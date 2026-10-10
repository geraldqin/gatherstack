import { afterEach, describe, expect, it } from "vitest"

import { DB_NAME } from "../schema"
import {
  createLocalBrainDexie,
  type LocalBrainDexie
} from "../drivers/indexeddb/dexieDb"
import { createSkillsRepository } from "./repository"
import type { SkillDocument } from "./types"

const opened: LocalBrainDexie[] = []

afterEach(async () => {
  while (opened.length > 0) {
    const db = opened.pop()
    db?.close()
  }
  indexedDB.deleteDatabase(DB_NAME)
})

function doc(overrides: Partial<SkillDocument> = {}): SkillDocument {
  return {
    id: "s1",
    name: "A",
    filename: "a.md",
    markdown: "---\nname: A\n---\n",
    createdAt: 100,
    updatedAt: 100,
    origin: "user",
    ...overrides
  }
}

async function openRepo() {
  const db = createLocalBrainDexie()
  opened.push(db)
  await db.open()
  return createSkillsRepository(db)
}

describe("createSkillsRepository", () => {
  it("upserts then gets by id", async () => {
    const repo = await openRepo()
    await repo.upsert(doc())
    const stored = await repo.getById("s1")
    expect(stored?.filename).toBe("a.md")
    expect(stored?.markdown).toContain("name: A")
  })

  it("lists by updatedAt descending", async () => {
    const repo = await openRepo()
    await repo.upsert(doc({ id: "a", updatedAt: 100, name: "a" }))
    await repo.upsert(doc({ id: "b", updatedAt: 300, name: "b" }))
    await repo.upsert(doc({ id: "c", updatedAt: 200, name: "c" }))
    const list = await repo.list()
    expect(list.map((item) => item.id)).toEqual(["b", "c", "a"])
  })

  it("deletes by id", async () => {
    const repo = await openRepo()
    await repo.upsert(doc())
    await repo.deleteById("s1")
    expect(await repo.getById("s1")).toBeUndefined()
    expect(await repo.list()).toEqual([])
  })
})
