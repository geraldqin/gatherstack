import { describe, expect, it } from "vitest"
import { buildDirectStoreRecord } from "./buildDirectStoreRecord"
import type { ChatMessage } from "../shared/chatMessages"

describe("buildDirectStoreRecord", () => {
  it("packs whole message when no skillId and plain text", () => {
    const message: ChatMessage = {
      id: "u1",
      role: "user",
      content: "备忘一条"
    }
    const { record, usedJsonPayload } = buildDirectStoreRecord(message)
    expect(usedJsonPayload).toBe(false)
    expect(record.skillId).toBe("")
    expect(JSON.parse(record.payload)).toEqual({
      role: "user",
      content: "备忘一条"
    })
  })

  it("stores bare json when no skillId", () => {
    const message: ChatMessage = {
      id: "u1",
      role: "user",
      content: `{
  "object": "list",
  "data": [
    {
      "id": "models/lyria-realtime-exp",
      "display_name": "Lyria Realtime Experimental"
    }
  ]
}`
    }
    const { record, usedJsonPayload } = buildDirectStoreRecord(message)
    expect(usedJsonPayload).toBe(true)
    expect(record.skillId).toBe("")
    expect(record.title).toBe("list · 1 项")
    expect(JSON.parse(record.payload)).toEqual({
      object: "list",
      data: [
        {
          id: "models/lyria-realtime-exp",
          display_name: "Lyria Realtime Experimental"
        }
      ]
    })
  })

  it("uses real skillId and json payload when parseable", () => {
    const message: ChatMessage = {
      id: "u1",
      role: "user",
      content: '{"title":"两居","rent":5000}',
      skillId: "skill-rent",
      skillName: "租房对比采集",
      attachment: { url: "https://ex.com/1", html: "<p/>" }
    }
    const { record, usedJsonPayload } = buildDirectStoreRecord(message)
    expect(usedJsonPayload).toBe(true)
    expect(record.skillId).toBe("skill-rent")
    expect(record.sourceUrl).toBe("https://ex.com/1")
    expect(record.title).toBe("两居")
    expect(JSON.parse(record.payload)).toEqual({
      title: "两居",
      rent: 5000
    })
  })

  it("degrades to whole pack when skill present but not json", () => {
    const message: ChatMessage = {
      id: "u1",
      role: "user",
      content: "不是 json",
      skillId: "skill-rent"
    }
    const { record, usedJsonPayload } = buildDirectStoreRecord(message)
    expect(usedJsonPayload).toBe(false)
    expect(record.skillId).toBe("skill-rent")
    expect(JSON.parse(record.payload)).toEqual({
      role: "user",
      content: "不是 json"
    })
  })

  it("degrades primitive json number to whole pack", () => {
    const message: ChatMessage = {
      id: "u1",
      role: "user",
      content: "42",
      skillId: "skill-rent"
    }
    const { record, usedJsonPayload } = buildDirectStoreRecord(message)
    expect(usedJsonPayload).toBe(false)
    expect(record.skillId).toBe("skill-rent")
    expect(JSON.parse(record.payload)).toEqual({
      role: "user",
      content: "42"
    })
  })

  it("accepts json array as payload", () => {
    const message: ChatMessage = {
      id: "u1",
      role: "user",
      content: "[1,2]",
      skillId: "skill-rent"
    }
    const { record, usedJsonPayload } = buildDirectStoreRecord(message)
    expect(usedJsonPayload).toBe(true)
    expect(record.skillId).toBe("skill-rent")
    expect(JSON.parse(record.payload)).toEqual([1, 2])
  })
})
