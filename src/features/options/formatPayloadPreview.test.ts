import { describe, expect, it } from "vitest"
import { formatPayloadPreview } from "./formatPayloadPreview"

describe("formatPayloadPreview", () => {
  it("pretty-prints valid JSON", () => {
    const raw = JSON.stringify({ role: "user", content: "hi" })
    expect(formatPayloadPreview(raw)).toBe(
      JSON.stringify({ role: "user", content: "hi" }, null, 2)
    )
  })

  it("returns original text when not JSON", () => {
    expect(formatPayloadPreview("not-json")).toBe("not-json")
  })
})
