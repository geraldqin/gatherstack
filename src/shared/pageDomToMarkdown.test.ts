import { Window } from "happy-dom"
import { describe, expect, it } from "vitest"
import { documentToMarkdown } from "./pageDomToMarkdown"

function docFromHtml(html: string): Document {
  const window = new Window()
  window.document.write(`<!DOCTYPE html><html>${html}</html>`)
  return window.document as unknown as Document
}

describe("pageDomToMarkdown", () => {
  it("strips script style nav footer and images", () => {
    const doc = docFromHtml(`<head><title>T</title></head><body>
      <nav>菜单</nav>
      <main>
        <h1>标题</h1>
        <p>正文<a href="/x">链</a></p>
        <img src="a.png" alt="图" />
        <script>evil()</script>
      </main>
      <footer>页脚</footer>
    </body>`)
    const { title, markdown } = documentToMarkdown(doc)
    expect(title).toBe("T")
    expect(markdown).toContain("标题")
    expect(markdown).toContain("正文")
    expect(markdown).toContain("链")
    expect(markdown).not.toContain("菜单")
    expect(markdown).not.toContain("页脚")
    expect(markdown).not.toContain("evil")
    expect(markdown).not.toMatch(/!\[/)
    expect(markdown).not.toContain("a.png")
  })

  it("prefers main over body chrome", () => {
    const doc = docFromHtml(`<body>
      <div>侧栏广告</div>
      <main><p>主内容唯一</p></main>
    </body>`)
    const { markdown } = documentToMarkdown(doc)
    expect(markdown).toContain("主内容唯一")
    expect(markdown).not.toContain("侧栏广告")
  })

  it("falls back when main is too short", () => {
    const doc = docFromHtml(`<body>
      <main></main>
      <div><p>真正的列表内容足够长用来回退检测的占位文字</p></div>
    </body>`)
    const { markdown } = documentToMarkdown(doc)
    expect(markdown).toContain("真正的列表内容")
  })

  it("converts tables to gfm pipes via documentToMarkdown", () => {
    const doc = docFromHtml(`<body><main>
      <table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>
    </main></body>`)
    const { markdown } = documentToMarkdown(doc)
    expect(markdown).toMatch(/\|/)
    expect(markdown).toContain("A")
    expect(markdown).toContain("1")
  })

  it("strips aside dialog aria-hidden and empty anchors", () => {
    const doc = docFromHtml(`<body><main>
      <h1>标题</h1>
      <p>正文<a href="/x"> </a>尾</p>
      <aside>侧栏噪声</aside>
      <div aria-hidden="true">隐藏块</div>
      <dialog open>弹层</dialog>
    </main></body>`)
    const { markdown } = documentToMarkdown(doc)
    expect(markdown).toContain("标题")
    expect(markdown).toContain("正文")
    expect(markdown).toContain("尾")
    expect(markdown).not.toContain("侧栏噪声")
    expect(markdown).not.toContain("隐藏块")
    expect(markdown).not.toContain("弹层")
    expect(markdown).not.toMatch(/\[\s*\]\(/)
  })

  it("polishes excess blank lines from sparse DOM", () => {
    const doc = docFromHtml(`<body><main>
      <p>一段</p>
      <p></p>
      <p></p>
      <p>二段</p>
    </main></body>`)
    const { markdown } = documentToMarkdown(doc)
    expect(markdown).not.toMatch(/\n{3,}/)
    expect(markdown).toContain("一段")
    expect(markdown).toContain("二段")
  })
})
