import { describe, expect, it } from "vitest"

import {
  createMysqlSyncSink,
  createPostgreSyncSink,
  createRemoteApiSyncSink,
  createSyncSink,
  DriverNotImplementedError,
  SYNC_DRIVER_KINDS
} from ".."

describe("sync driver stubs", () => {
  it("exposes mysql, postgre, and remote-api kinds", () => {
    expect([...SYNC_DRIVER_KINDS]).toEqual(["mysql", "postgre", "remote-api"])
  })

  it.each([
    ["mysql", createMysqlSyncSink],
    ["postgre", createPostgreSyncSink],
    ["remote-api", createRemoteApiSyncSink]
  ] as const)("%s sink rejects with DriverNotImplementedError", async (kind, create) => {
    const sink = create()
    expect(sink.kind).toBe(kind)
    const error = await sink.upsert({
      id: "x",
      createdAt: 0,
      sourceUrl: "https://example.com/",
      title: "t",
      payload: "{}"
    }).catch((reason) => reason)
    expect(error).toBeInstanceOf(DriverNotImplementedError)
    expect(error.message).toBe(`存储驱动尚未实现: ${kind}`)
  })

  it("createSyncSink dispatches by kind", () => {
    expect(createSyncSink("mysql").kind).toBe("mysql")
    expect(createSyncSink("postgre").kind).toBe("postgre")
    expect(createSyncSink("remote-api").kind).toBe("remote-api")
  })
})
