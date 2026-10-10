import { describe, expect, it } from "vitest"
import { polishPageMarkdown } from "./polishPageMarkdown"

describe("polishPageMarkdown", () => {
  it("collapses excess blank lines and trims", () => {
    expect(polishPageMarkdown("a\n\n\n\nb\n")).toBe("a\n\nb")
  })

  it("drops empty links and images", () => {
    const md = "前文\n\n[](https://x.test)\n\n![x](a.png)\n\n后文"
    expect(polishPageMarkdown(md)).toBe("前文\n\n后文")
  })

  it("keeps link text when href is empty", () => {
    expect(polishPageMarkdown("见[详情]()。")).toBe("见详情。")
  })

  it("removes empty headings and list items", () => {
    const md = "#\n\n## 有字\n\n-\n\n* \n\n1.\n\n正文"
    expect(polishPageMarkdown(md)).toBe("## 有字\n\n正文")
  })

  it("strips trailing spaces per line", () => {
    expect(polishPageMarkdown("行末  \n下一行")).toBe("行末\n下一行")
  })
})
