import { describe, expect, it } from "vitest"

import { titleFromMessages, trimSession } from "./trimSession"
import type { ChatSessionInput } from "./types"

function baseSession(overrides: Partial<ChatSessionInput> = {}): ChatSessionInput {
  return {
    id: "session-1",
    title: "旧标题",
    createdAt: 1,
    updatedAt: 2,
    sessionModel: null,
    draftAttachment: null,
    draftSkill: null,
    messages: [],
    ...overrides
  }
}

describe("trimSession", () => {
  it("strips html from draft and message attachments, keeping only url", () => {
    const result = trimSession(
      baseSession({
        draftAttachment: { url: "https://example.com", html: "<p>draft</p>" },
        messages: [
          {
            id: "m1",
            role: "user",
            content: "hi",
            attachment: { url: "https://a.com", html: "<body>a</body>" }
          }
        ]
      })
    )

    expect(result.draftAttachment).toEqual({ url: "https://example.com" })
    expect(result.messages[0]?.attachment).toEqual({ url: "https://a.com" })
  })

  it("keeps only the most recent 40 messages", () => {
    const messages = Array.from({ length: 45 }, (_, index) => ({
      id: `m${index}`,
      role: "user" as const,
      content: `message-${index}`
    }))

    const result = trimSession(baseSession({ messages }))

    expect(result.messages).toHaveLength(40)
    expect(result.messages[0]?.content).toBe("message-5")
    expect(result.messages[39]?.content).toBe("message-44")
  })

  it("changes streaming assistant messages to complete", () => {
    const result = trimSession(
      baseSession({
        messages: [
          { id: "u1", role: "user", content: "q" },
          { id: "a1", role: "assistant", content: "partial", status: "streaming" },
          { id: "a2", role: "assistant", content: "stopped", status: "stopped" },
          { id: "a3", role: "assistant", content: "err", status: "error" }
        ]
      })
    )

    expect(result.messages[1]?.status).toBe("complete")
    expect(result.messages[2]?.status).toBe("stopped")
    expect(result.messages[3]?.status).toBe("error")
  })

  it("drops oldest messages when serialized size exceeds maxBytes", () => {
    const result = trimSession(
      baseSession({
        messages: [
          { id: "m1", role: "user", content: "AAAA" },
          { id: "m2", role: "user", content: "BBBB" },
          { id: "m3", role: "user", content: "CCCC" }
        ]
      }),
      { maxMessages: 40, maxBytes: 120, titleMax: 40 }
    )

    expect(result.messages.length).toBeLessThan(3)
    expect(result.messages[0]?.content).not.toBe("AAAA")
  })

  it("truncates a single oversized message content as a last resort", () => {
    const huge = "x".repeat(500)
    const result = trimSession(
      baseSession({
        messages: [{ id: "m1", role: "user", content: huge }]
      }),
      { maxMessages: 40, maxBytes: 80, titleMax: 40 }
    )

    expect(result.messages).toHaveLength(1)
    expect(result.messages[0]?.content.length).toBeLessThan(huge.length)
    expect(result.messages[0]?.content.endsWith("…")).toBe(true)
  })

  it("derives title from the first user message first line", () => {
    const result = trimSession(
      baseSession({
        messages: [{ id: "m1", role: "user", content: "  hello world\nsecond line" }]
      })
    )

    expect(result.title).toBe("hello world")
  })

  it("preserves sendMode and suppressAutoPageAttach", () => {
    const result = trimSession(
      baseSession({
        sendMode: "oneClickCollect",
        suppressAutoPageAttach: true,
        messages: [{ id: "m1", role: "user", content: "hi" }]
      })
    )

    expect(result.sendMode).toBe("oneClickCollect")
    expect(result.suppressAutoPageAttach).toBe(true)
  })

  it("omits sendMode and suppressAutoPageAttach when undefined", () => {
    const result = trimSession(baseSession())

    expect(result).not.toHaveProperty("sendMode")
    expect(result).not.toHaveProperty("suppressAutoPageAttach")
  })
})

describe("titleFromMessages", () => {
  it('returns "对话" when there is no user message', () => {
    expect(titleFromMessages([])).toBe("对话")
  })

  it("truncates long titles with an ellipsis", () => {
    const longLine = "a".repeat(50)
    expect(titleFromMessages([{ id: "m1", role: "user", content: longLine }])).toBe(
      `${"a".repeat(40)}…`
    )
  })
})
