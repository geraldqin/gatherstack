import { describe, expect, it } from "vitest"

import type { ChatMessage } from "../shared/chatMessages"
import { getNoJsonToSaveMessage } from "./extractJsonFromAssistant"
import { jsonFromSkillRecordBuilder } from "./jsonFromSkillRecordBuilder"

describe("jsonFromSkillRecordBuilder", () => {
  it("stores parsed json with skillId and sourceUrl from prior user", () => {
    const messages: ChatMessage[] = [
      {
        id: "u1",
        role: "user",
        content: "",
        attachment: { url: "https://house.example/1", html: "<p>x</p>" },
        skillId: "skill-1",
        skillName: "租房对比采集"
      },
      {
        id: "a1",
        role: "assistant",
        content: '```json\n{"title":"精装两居","id":"BJ1"}\n```',
        status: "complete",
        skillId: "skill-1"
      }
    ]
    const record = jsonFromSkillRecordBuilder.buildRecord({
      message: messages[1]!,
      messages
    })
    expect(record.skillId).toBe("skill-1")
    expect(record.sourceUrl).toBe("https://house.example/1")
    expect(record.title).toBe("精装两居")
    expect(JSON.parse(record.payload)).toEqual({
      title: "精装两居",
      id: "BJ1"
    })
  })

  it("throws when content has no json", () => {
    const message: ChatMessage = {
      id: "a1",
      role: "assistant",
      content: "抱歉，无法抽取",
      status: "complete",
      skillId: "skill-1"
    }
    expect(() =>
      jsonFromSkillRecordBuilder.buildRecord({ message, messages: [message] })
    ).toThrow(getNoJsonToSaveMessage())
  })

  it("does not use markdown fence as title when json title/id are null", () => {
    const messages: ChatMessage[] = [
      {
        id: "u1",
        role: "user",
        content: "",
        attachment: { url: "https://house.example/1", markdown: "x" },
        skillId: "skill-1"
      },
      {
        id: "a1",
        role: "assistant",
        content: '```json\n{"title":null,"id":null,"rentType":null}\n```',
        status: "complete",
        skillId: "skill-1"
      }
    ]
    const record = jsonFromSkillRecordBuilder.buildRecord({
      message: messages[1]!,
      messages
    })
    expect(record.title).toBe("助手消息")
    expect(record.title).not.toContain("```")
  })
})
