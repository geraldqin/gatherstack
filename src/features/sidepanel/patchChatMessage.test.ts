import { describe, expect, it } from "vitest"

import type { ChatMessage } from "~shared/chatMessages"

import { patchChatMessageList } from "./patchChatMessage"

describe("patchChatMessageList", () => {
  it("returns a new list with the target message patched", () => {
    const messages: ChatMessage[] = [
      { id: "a1", role: "assistant", content: "hi", status: "streaming" }
    ]
    const next = patchChatMessageList(messages, "a1", { status: "complete" })
    expect(next[0]?.status).toBe("complete")
    expect(next[0]?.content).toBe("hi")
    expect(messages[0]?.status).toBe("streaming")
  })
})
