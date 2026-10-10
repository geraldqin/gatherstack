import { afterEach, describe, expect, it } from "vitest"

import {
  DB_NAME,
  openLocalBrainDb,
  PRIMARY_DRIVER,
  type LocalBrainDbHandle
} from "."

const opened: LocalBrainDbHandle[] = []

afterEach(async () => {
  while (opened.length > 0) {
    const db = opened.pop()
    await db?.primary.close()
  }
  indexedDB.deleteDatabase(DB_NAME)
})

describe("openLocalBrainDb", () => {
  it("opens IndexedDB as the primary store with no sync sinks by default", async () => {
    const db = await openLocalBrainDb()
    opened.push(db)
    expect(db.kind).toBe("local-brain-db")
    expect(db.primary.kind).toBe(PRIMARY_DRIVER)
    expect(db.syncSinks).toEqual([])
  })
})
