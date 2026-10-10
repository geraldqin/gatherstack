import { describe, expect, it } from "vitest"
import {
  PAGE_MARKDOWN_LLM_MAX_CHARS,
  truncateForLlm
} from "./truncateForLlm"

describe("truncateForLlm", () => {
  it("returns short text unchanged", () => {
    expect(truncateForLlm("hello")).toBe("hello")
  })

  it("truncates long text with suffix", () => {
    const raw = "a".repeat(PAGE_MARKDOWN_LLM_MAX_CHARS + 10)
    const out = truncateForLlm(raw)
    expect(out.startsWith("a".repeat(PAGE_MARKDOWN_LLM_MAX_CHARS))).toBe(true)
    expect(out).toContain("…（内容过长，已截断）")
    expect(out.length).toBe(
      PAGE_MARKDOWN_LLM_MAX_CHARS + "\n\n…（内容过长，已截断）".length
    )
  })

  it("is idempotent after truncation", () => {
    const raw = "b".repeat(PAGE_MARKDOWN_LLM_MAX_CHARS + 5)
    const once = truncateForLlm(raw)
    expect(truncateForLlm(once)).toBe(once)
  })
})
