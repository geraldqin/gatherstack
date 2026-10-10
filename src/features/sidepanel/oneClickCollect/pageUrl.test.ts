import { describe, expect, it } from "vitest"

import { normalizePageUrl, pageUrlsEqual } from "./pageUrl"

describe("normalizePageUrl", () => {
  it("strips hash from valid URL", () => {
    expect(normalizePageUrl("https://ex.com/a#frag")).toBe("https://ex.com/a")
  })

  it("keeps pathname and search", () => {
    expect(normalizePageUrl("https://ex.com/a?q=1")).toBe("https://ex.com/a?q=1")
  })

  it("returns trimmed string on invalid URL", () => {
    expect(normalizePageUrl("  not-a-url  ")).toBe("not-a-url")
  })
})

describe("pageUrlsEqual", () => {
  it("treats same URL ignoring hash as equal", () => {
    expect(
      pageUrlsEqual("https://ex.com/a#one", "https://ex.com/a#two")
    ).toBe(true)
  })

  it("returns false for different paths", () => {
    expect(pageUrlsEqual("https://ex.com/a", "https://ex.com/b")).toBe(false)
  })

  it("compares trimmed invalid strings", () => {
    expect(pageUrlsEqual("  foo  ", "foo")).toBe(true)
  })
})
