import { describe, expect, it } from "vitest"

import { buildAsyncParseMessages } from "./buildAsyncParseMessages"

describe("buildAsyncParseMessages", () => {
  it("builds single-turn user content without history", () => {
    const messages = buildAsyncParseMessages({
      text: "only this",
      attachment: null
    })
    expect(messages).toEqual([{ role: "user", content: "only this" }])
  })

  it("includes skill system and page attachment", () => {
    const skillMarkdown = `---
name: demo
---
Extract JSON`
    const messages = buildAsyncParseMessages({
      text: "note",
      attachment: {
        url: "https://example.com/a",
        markdown: "# hi"
      },
      skillMarkdown
    })
    expect(messages[0]).toEqual({ role: "system", content: "Extract JSON" })
    expect(messages[1]?.role).toBe("user")
    expect(messages[1]?.content).toContain("note")
    expect(messages[1]?.content).toContain("https://example.com/a")
    expect(messages[1]?.content).toContain("```markdown")
    expect(messages[1]?.content).toContain("# hi")
    expect(messages[1]?.content).not.toContain("```html")
    expect(messages).toHaveLength(2)
  })
})
