import { describe, expect, it } from "vitest"

import type { ChatMessage } from "../shared/chatMessages"

import {
  buildDefaultPayload,
  defaultRecordBuilder,
  titleFromMessage
} from "./defaultRecordBuilder"

describe("defaultRecordBuilder", () => {
  it("builds a full-message record with empty skillId", () => {
    const message: ChatMessage = {
      id: "m1",
      role: "assistant",
      content: "hello\nworld",
      status: "complete",
      attachment: {
        url: "https://example.com/page",
        html: "<html></html>"
      }
    }
    const record = defaultRecordBuilder.buildRecord({ message })
    expect(record.skillId).toBe("")
    expect(record.sourceUrl).toBe("https://example.com/page")
    expect(record.title).toBe("hello")
    expect(JSON.parse(record.payload)).toEqual({
      role: "assistant",
      content: "hello\nworld",
      attachment: message.attachment
    })
  })

  it("falls back title by role when content empty", () => {
    expect(
      titleFromMessage({ id: "u", role: "user", content: "  " })
    ).toBe("用户消息")
    expect(
      titleFromMessage({ id: "a", role: "assistant", content: "" })
    ).toBe("助手消息")
  })

  it("skips markdown fence and json dump lines for title", () => {
    expect(
      titleFromMessage({
        id: "a",
        role: "assistant",
        content: '```json\n{"title":null}\n```'
      })
    ).toBe("助手消息")
    expect(
      titleFromMessage({
        id: "a",
        role: "assistant",
        content: "```json\n精装两居朝南\n```"
      })
    ).toBe("精装两居朝南")
  })

  it("omits attachment from payload when absent", () => {
    const payload = buildDefaultPayload({
      id: "m",
      role: "user",
      content: "hi"
    })
    expect(JSON.parse(payload)).toEqual({ role: "user", content: "hi" })
  })

  it("stores pretty json object as payload with list title", () => {
    const message: ChatMessage = {
      id: "m1",
      role: "user",
      content: `{
  "object": "list",
  "data": [{ "id": "models/x", "display_name": "X" }]
}
读取模型名称`
    }
    const record = defaultRecordBuilder.buildRecord({ message })
    expect(record.title).toBe("list · 1 项")
    expect(JSON.parse(record.payload)).toEqual({
      object: "list",
      data: [{ id: "models/x", display_name: "X" }]
    })
  })
})
