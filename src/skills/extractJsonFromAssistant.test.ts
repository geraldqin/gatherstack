import { describe, expect, it } from "vitest"

import {
  extractJsonFromAssistant,
  getNoJsonToSaveMessage
} from "./extractJsonFromAssistant"

describe("extractJsonFromAssistant", () => {
  it("parses a fenced json block", () => {
    const content = `说明\n\`\`\`json\n{"title":"房"}\n\`\`\`\n`
    expect(extractJsonFromAssistant(content)).toEqual({ title: "房" })
  })

  it("parses a bare object", () => {
    expect(extractJsonFromAssistant('前缀 {"id":"BJ1","n":1} 后缀')).toEqual({
      id: "BJ1",
      n: 1
    })
  })

  it("throws when no json", () => {
    expect(() => extractJsonFromAssistant("没有结构化数据")).toThrow(
      getNoJsonToSaveMessage()
    )
  })
})
