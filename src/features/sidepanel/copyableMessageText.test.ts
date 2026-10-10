import { describe, expect, it } from "vitest"

import { canCopyMessage, copyableMessageText } from "./copyableMessageText"

describe("copyableMessageText", () => {
  it("prefers message content", () => {
    expect(
      copyableMessageText({
        id: "1",
        role: "assistant",
        content: "hello",
        attachment: { url: "https://example.com", html: "<p></p>" }
      })
    ).toBe("hello")
  })

  it("falls back to attachment url when content empty", () => {
    expect(
      copyableMessageText({
        id: "1",
        role: "user",
        content: "",
        attachment: { url: "https://example.com/a", html: "<p></p>" }
      })
    ).toBe("https://example.com/a")
  })

  it("canCopyMessage is false when nothing to copy", () => {
    expect(
      canCopyMessage({ id: "1", role: "assistant", content: "" })
    ).toBe(false)
  })
})
