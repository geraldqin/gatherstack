import { describe, expect, it } from "vitest"

import type { ChatMessage } from "~shared/chatMessages"

import { canSaveMessage } from "./canSaveMessage"

describe("canSaveMessage", () => {
  it("allows user messages with content", () => {
    const message: ChatMessage = {
      id: "u1",
      role: "user",
      content: "hi"
    }
    expect(canSaveMessage(message)).toBe(true)
  })

  it("allows completed assistant messages", () => {
    expect(
      canSaveMessage({
        id: "a1",
        role: "assistant",
        content: "done",
        status: "complete"
      })
    ).toBe(true)
  })

  it("rejects messages that already have savedRecordId", () => {
    expect(
      canSaveMessage({
        id: "u2",
        role: "user",
        content: "already saved",
        savedRecordId: "rec-1"
      })
    ).toBe(false)
  })

  it("rejects streaming or empty assistant messages", () => {
    expect(
      canSaveMessage({
        id: "a2",
        role: "assistant",
        content: "partial",
        status: "streaming"
      })
    ).toBe(false)
    expect(
      canSaveMessage({
        id: "a3",
        role: "assistant",
        content: "",
        status: "complete"
      })
    ).toBe(false)
  })
})
