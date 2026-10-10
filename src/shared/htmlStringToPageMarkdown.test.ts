import { describe, expect, it } from "vitest"

import { htmlStringToPageMarkdown } from "./htmlStringToPageMarkdown"
import { PAGE_MARKDOWN_LLM_MAX_CHARS } from "./truncateForLlm"

describe("htmlStringToPageMarkdown", () => {
  it("converts main content with title prefix via documentToMarkdown", () => {
    const md = htmlStringToPageMarkdown(
      "<html><head><title>T</title></head><body><main><h1>Hi</h1></main></body></html>"
    )
    expect(md).toContain("Hi")
    expect(md).toContain("标题：T")
  })

  it("omits title prefix when title is empty", () => {
    const md = htmlStringToPageMarkdown("<body><main><p>仅正文</p></main></body>")
    expect(md).not.toContain("标题：")
    expect(md).toContain("仅正文")
  })

  it("strips nav and footer like documentToMarkdown pipeline", () => {
    const md = htmlStringToPageMarkdown(`<body>
      <nav>菜单</nav>
      <main><p>正文</p></main>
      <footer>页脚</footer>
    </body>`)
    expect(md).toContain("正文")
    expect(md).not.toContain("菜单")
    expect(md).not.toContain("页脚")
  })

  it("truncates very long markdown for llm", () => {
    const long = "字".repeat(PAGE_MARKDOWN_LLM_MAX_CHARS + 50)
    const md = htmlStringToPageMarkdown(`<body><main><p>${long}</p></main></body>`)
    expect(md).toContain("…（内容过长，已截断）")
    expect(md.length).toBeGreaterThan(PAGE_MARKDOWN_LLM_MAX_CHARS)
  })
})
