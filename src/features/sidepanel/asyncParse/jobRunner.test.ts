import { describe, expect, it } from "vitest"

import { createAsyncParseJobRunner } from "./jobRunner"
import type { AsyncParseJobEnqueueInput } from "./types"

function baseJob(
  overrides: Partial<AsyncParseJobEnqueueInput> & Pick<AsyncParseJobEnqueueInput, "id">
): AsyncParseJobEnqueueInput {
  return {
    sessionId: "s1",
    createdAt: 1,
    text: "hello",
    attachment: null,
    skill: null,
    selection: { providerId: "p", modelId: "m" },
    autoSave: false,
    maxConcurrent: 5,
    ...overrides
  }
}

describe("createAsyncParseJobRunner", () => {
  it("respects max concurrent with FIFO queue", () => {
    const runner = createAsyncParseJobRunner(2)
    runner.enqueue(baseJob({ id: "1", text: "a" }))
    runner.enqueue(baseJob({ id: "2", text: "b" }))
    runner.enqueue(baseJob({ id: "3", text: "c" }))

    expect(runner.takeNextToStart()?.id).toBe("1")
    expect(runner.takeNextToStart()?.id).toBe("2")
    expect(runner.takeNextToStart()).toBeNull()
    expect(runner.getSnapshot().queued.map((j) => j.id)).toEqual(["3"])
    expect(runner.getSnapshot().running.map((j) => j.id)).toEqual(["1", "2"])

    runner.finish("1")
    expect(runner.takeNextToStart()?.id).toBe("3")
    expect(runner.getSnapshot().queued).toEqual([])
    expect(runner.getSnapshot().running.map((j) => j.id)).toEqual(["2", "3"])
  })

  it("cancel removes queued without assistant ids and aborts running", () => {
    const runner = createAsyncParseJobRunner(1)
    runner.enqueue(baseJob({ id: "1" }))
    runner.enqueue(baseJob({ id: "2" }))
    const started = runner.takeNextToStart()
    expect(started?.id).toBe("1")
    runner.markRunningIds("1", "u1", "a1")

    const result = runner.cancel(["1", "2"])
    expect(result.abortedAssistantIds).toEqual(["a1"])
    expect(runner.getSnapshot().queued).toEqual([])
    expect(runner.getSnapshot().running).toEqual([])
    expect(runner.getAbortController("1")).toBeUndefined()
  })

  it("cancelSession only clears matching session", () => {
    const runner = createAsyncParseJobRunner(2)
    runner.enqueue(baseJob({ id: "1", sessionId: "s1" }))
    runner.enqueue(baseJob({ id: "2", sessionId: "s2" }))
    runner.takeNextToStart()
    runner.takeNextToStart()

    runner.cancelSession("s1")
    const snap = runner.getSnapshot()
    expect(snap.running.map((j) => j.id)).toEqual(["2"])
    expect(snap.queued).toEqual([])
  })

  it("raising maxConcurrent allows taking more", () => {
    const runner = createAsyncParseJobRunner(1)
    runner.enqueue(baseJob({ id: "1" }))
    runner.enqueue(baseJob({ id: "2" }))
    expect(runner.takeNextToStart()?.id).toBe("1")
    expect(runner.takeNextToStart()).toBeNull()

    runner.setMaxConcurrent(2)
    expect(runner.takeNextToStart()?.id).toBe("2")
  })

  it("findByAssistantMessageId looks up running jobs", () => {
    const runner = createAsyncParseJobRunner(1)
    runner.enqueue(baseJob({ id: "1" }))
    runner.takeNextToStart()
    runner.markRunningIds("1", "u1", "a1")
    expect(runner.findByAssistantMessageId("a1")?.id).toBe("1")
    expect(runner.findByAssistantMessageId("missing")).toBeUndefined()
  })
})
