import { describe, expect, it } from "vitest"

import { stripHtmlNoise } from "./stripHtmlNoise"

describe("stripHtmlNoise", () => {
  it("removes hard noise tags but keeps text content", () => {
    const out = stripHtmlNoise("<p>a</p><script>x()</script><svg></svg>")
    expect(out).not.toContain("script")
    expect(out).not.toContain("x()")
    expect(out).not.toContain("svg")
    expect(out).toContain("a")
  })

  it("removes style template iframe canvas object embed noscript", () => {
    const out = stripHtmlNoise(`<div>keep
      <style>.x{}</style>
      <template>t</template>
      <noscript>n</noscript>
      <iframe src="x"></iframe>
      <canvas></canvas>
      <object data="o"></object>
      <embed src="e">
    </div>`)
    expect(out).toContain("keep")
    expect(out).not.toMatch(/<(style|template|noscript|iframe|canvas|object|embed)\b/i)
  })

  it("removes meta and link from head", () => {
    const out = stripHtmlNoise(`<html><head>
      <meta charset="utf-8">
      <meta name="description" content="desc">
      <link rel="stylesheet" href="a.css">
      <title>T</title>
    </head><body><p>正文</p></body></html>`)
    expect(out).toContain("正文")
    expect(out).toContain("T")
    expect(out).not.toMatch(/<meta\b/i)
    expect(out).not.toMatch(/<link\b/i)
  })

  it("does not strip nav footer or img", () => {
    const out = stripHtmlNoise(
      "<nav>菜单</nav><main><img src='a.png' alt='图'></main><footer>页脚</footer>"
    )
    expect(out).toContain("菜单")
    expect(out).toContain("页脚")
    expect(out).toContain("img")
    expect(out).toContain("a.png")
  })

  it("does not extract main — keeps full document structure", () => {
    const out = stripHtmlNoise(
      "<html><body><aside>侧栏</aside><main><p>主</p></main></body></html>"
    )
    expect(out).toContain("侧栏")
    expect(out).toContain("主")
  })
})
