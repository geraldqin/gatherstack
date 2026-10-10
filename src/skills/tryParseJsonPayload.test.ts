import { describe, expect, it } from "vitest"
import { tryParseJsonPayload } from "./tryParseJsonPayload"

describe("tryParseJsonPayload", () => {
  it("parses bare object and array", () => {
    expect(tryParseJsonPayload('{"a":1}')).toEqual({ a: 1 })
    expect(tryParseJsonPayload("[1,2]")).toEqual([1, 2])
  })

  it("parses fenced json via extract fallback", () => {
    expect(
      tryParseJsonPayload('见下：\n```json\n{"title":"x"}\n```')
    ).toEqual({ title: "x" })
  })

  it("returns null when no json", () => {
    expect(tryParseJsonPayload("你好")).toBeNull()
  })
})
