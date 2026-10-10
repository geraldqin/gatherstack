import { describe, expect, it } from "vitest"

import {
  BUBBLE_COLLAPSE_MAX_CHARS,
  BUBBLE_COLLAPSE_MAX_LINES,
  previewBubbleContent,
  shouldCollapseBubble
} from "./messageBubbleCollapse"

describe("shouldCollapseBubble", () => {
  it("does not collapse streaming assistant messages", () => {
    const long = "x".repeat(BUBBLE_COLLAPSE_MAX_CHARS + 1)
    expect(
      shouldCollapseBubble({
        role: "assistant",
        content: long,
        status: "streaming"
      })
    ).toBe(false)
  })

  it("does not collapse short assistant messages", () => {
    expect(
      shouldCollapseBubble({
        role: "assistant",
        content: "短回复",
        status: "done"
      })
    ).toBe(false)
  })

  it("collapses assistant messages over char threshold", () => {
    expect(
      shouldCollapseBubble({
        role: "assistant",
        content: "a".repeat(BUBBLE_COLLAPSE_MAX_CHARS + 1),
        status: "done"
      })
    ).toBe(true)
  })

  it("collapses assistant messages over line threshold", () => {
    const lines = Array.from(
      { length: BUBBLE_COLLAPSE_MAX_LINES + 1 },
      (_, i) => `line ${i}`
    ).join("\n")
    expect(
      shouldCollapseBubble({
        role: "assistant",
        content: lines,
        status: "done"
      })
    ).toBe(true)
  })

  it("does not collapse user messages even when long", () => {
    expect(
      shouldCollapseBubble({
        role: "user",
        content: "u".repeat(BUBBLE_COLLAPSE_MAX_CHARS + 50),
        status: "done"
      })
    ).toBe(false)
  })
})

describe("previewBubbleContent", () => {
  it("keeps short content unchanged", () => {
    expect(previewBubbleContent("hello")).toBe("hello")
  })

  it("limits by lines then chars", () => {
    const lines = Array.from(
      { length: BUBBLE_COLLAPSE_MAX_LINES + 5 },
      (_, i) => `L${i}`
    )
    const preview = previewBubbleContent(lines.join("\n"))
    expect(preview.split("\n")).toHaveLength(BUBBLE_COLLAPSE_MAX_LINES)
    expect(preview.endsWith("…")).toBe(true)
  })

  it("truncates long single-line content", () => {
    const preview = previewBubbleContent(
      "a".repeat(BUBBLE_COLLAPSE_MAX_CHARS + 20)
    )
    expect(preview.length).toBeLessThanOrEqual(BUBBLE_COLLAPSE_MAX_CHARS + 1)
    expect(preview.endsWith("…")).toBe(true)
  })
})
