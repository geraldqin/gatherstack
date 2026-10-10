import { describe, expect, it } from "vitest"

import { canDirectStore } from "./canDirectStore"

describe("canDirectStore", () => {
  it("returns false for empty input", () => {
    expect(
      canDirectStore({
        text: "",
        attachment: null,
        skill: null,
        isStreaming: false
      })
    ).toBe(false)
  })

  it("returns true when text has content", () => {
    expect(
      canDirectStore({
        text: "memo",
        attachment: null,
        skill: null,
        isStreaming: false
      })
    ).toBe(true)
  })

  it("returns false for attachment without skill", () => {
    expect(
      canDirectStore({
        text: "",
        attachment: { url: "https://ex.com", html: "<p/>" },
        skill: null,
        isStreaming: false
      })
    ).toBe(false)
  })

  it("returns true for attachment with skill and no text", () => {
    expect(
      canDirectStore({
        text: "",
        attachment: { url: "https://ex.com", html: "<p/>" },
        skill: { id: "skill-1" },
        isStreaming: false
      })
    ).toBe(true)
  })

  it("returns false while streaming", () => {
    expect(
      canDirectStore({
        text: "memo",
        attachment: null,
        skill: null,
        isStreaming: true
      })
    ).toBe(false)
  })
})
