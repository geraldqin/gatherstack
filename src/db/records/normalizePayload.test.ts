import { describe, expect, it } from "vitest"

import { normalizeRecordPayload } from "./normalizePayload"

describe("normalizeRecordPayload", () => {
  it("pretty-prints JSON object", () => {
    expect(normalizeRecordPayload('{"a":1}')).toBe('{\n  "a": 1\n}')
  })

  it("pretty-prints JSON array", () => {
    expect(normalizeRecordPayload("[1,2]")).toBe("[\n  1,\n  2\n]")
  })

  it("returns raw for plain text", () => {
    expect(normalizeRecordPayload("hello")).toBe("hello")
  })

  it("returns raw for JSON primitive", () => {
    expect(normalizeRecordPayload('"x"')).toBe('"x"')
    expect(normalizeRecordPayload("42")).toBe("42")
    expect(normalizeRecordPayload("null")).toBe("null")
  })

  it("returns original raw when parse fails including whitespace", () => {
    expect(normalizeRecordPayload("  not-json  ")).toBe("  not-json  ")
  })
})
