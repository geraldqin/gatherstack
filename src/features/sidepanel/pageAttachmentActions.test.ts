import { describe, expect, it } from "vitest"

import { pageContentFormat, type PageAttachment } from "~shared/chatMessages"
import { PAGE_MARKDOWN_LLM_MAX_CHARS } from "~shared/truncateForLlm"

import {
  applyEditedBody,
  applyLoadOriginal,
  applySimplify,
  applyStrip,
  isPageAttachmentEditable,
  pageAttachmentToolbar,
  resolveLoadOriginalAfterAwait
} from "./pageAttachmentActions"

const pageMd: PageAttachment = {
  url: "https://example.com/list",
  markdown: "# 标题\n\n正文",
  title: "列页"
}

const pageHtml: PageAttachment = {
  url: "https://example.com/list",
  contentFormat: "html",
  html: "<p>正文</p><script>x()</script>",
  title: "列页"
}

const record: PageAttachment = {
  url: "https://example.com/item",
  html: '{"id":"r1"}',
  kind: "record",
  title: "示例"
}

describe("isPageAttachmentEditable", () => {
  it("is editable when onAttachmentChange is passed for a page attachment", () => {
    expect(isPageAttachmentEditable(pageMd, () => {})).toBe(true)
  })

  it("is read-only when onAttachmentChange is omitted", () => {
    expect(isPageAttachmentEditable(pageMd)).toBe(false)
    expect(isPageAttachmentEditable(pageHtml, undefined)).toBe(false)
  })

  it("is never editable for record attachments", () => {
    expect(isPageAttachmentEditable(record, () => {})).toBe(false)
  })
})

describe("pageAttachmentToolbar", () => {
  it("hides toggle buttons when not editable", () => {
    expect(pageAttachmentToolbar(pageMd, false)).toEqual([])
    expect(pageAttachmentToolbar(pageHtml, false)).toEqual([])
    expect(pageAttachmentToolbar(record, true)).toEqual([])
  })

  it("shows load original when editable markdown", () => {
    expect(pageAttachmentToolbar(pageMd, true)).toEqual(["loadOriginal"])
  })

  it("shows simplify and strip noise when editable html", () => {
    expect(pageAttachmentToolbar(pageHtml, true)).toEqual([
      "simplifyMarkdown",
      "stripNoise"
    ])
  })
})

describe("applyEditedBody", () => {
  it("writes markdown via withPageMarkdown for markdown format", () => {
    const next = applyEditedBody(pageMd, "# edited")
    expect(pageContentFormat(next)).toBe("markdown")
    expect(next.markdown).toBe("# edited")
    expect(next.html).toBeUndefined()
  })

  it("writes html via withPageHtml for html format", () => {
    const next = applyEditedBody(pageHtml, "<p>edited</p>")
    expect(pageContentFormat(next)).toBe("html")
    expect(next.html).toBe("<p>edited</p>")
    expect(next.markdown).toBeUndefined()
  })
})

describe("applyLoadOriginal", () => {
  it("keeps full outerHTML (no 32k slice) so later simplify can still see body", () => {
    const longHtml = `<html>${"a".repeat(PAGE_MARKDOWN_LLM_MAX_CHARS + 80)}</html>`
    const { next, errorMessage } = applyLoadOriginal(pageMd, {
      ok: true,
      url: "https://example.com/now",
      html: longHtml
    })
    expect(errorMessage).toBeNull()
    expect(next).toBeDefined()
    expect(pageContentFormat(next!)).toBe("html")
    expect(next!.url).toBe("https://example.com/now")
    expect(next!.html).toBe(longHtml)
    expect(next!.html).not.toContain("…（内容过长，已截断）")
    expect(next!.markdown).toBeUndefined()
    expect(pageMd.contentFormat).toBeUndefined()
    expect(pageMd.markdown).toBe("# 标题\n\n正文")
  })

  it("preserves body after a huge head so simplify-to-markdown still works", () => {
    const html = `<html><head><title>T</title><style>${"x".repeat(PAGE_MARKDOWN_LLM_MAX_CHARS)}</style></head><body><main><p>主体列表内容足够长</p></main></body></html>`
    const { next, errorMessage } = applyLoadOriginal(pageMd, {
      ok: true,
      url: "https://example.com/now",
      html
    })
    expect(errorMessage).toBeNull()
    expect(next!.html).toContain("主体列表内容足够长")
    const simplified = applySimplify(next!, next!.html!)
    expect(simplified.markdown).toContain("主体列表内容足够长")
    expect(simplified.markdown).toContain("标题：T")
  })

  it("keeps current url when result url is empty", () => {
    const { next, errorMessage } = applyLoadOriginal(pageMd, {
      ok: true,
      url: "",
      html: "<html><body>ok</body></html>"
    })
    expect(errorMessage).toBeNull()
    expect(next?.url).toBe(pageMd.url)
    expect(next?.html).toBe("<html><body>ok</body></html>")
  })

  it("returns errorMessage and does not produce next on failure", () => {
    const { next, errorMessage } = applyLoadOriginal(pageMd, {
      ok: false,
      errorMessage: "无法读取当前标签页"
    })
    expect(errorMessage).toBe("无法读取当前标签页")
    expect(next).toBeUndefined()
  })

  it("does not overwrite record attachments", () => {
    const { next, errorMessage } = applyLoadOriginal(record, {
      ok: true,
      url: "https://other.example/",
      html: "<html></html>"
    })
    expect(errorMessage).toBeNull()
    expect(next).toBeUndefined()
  })
})

describe("resolveLoadOriginalAfterAwait", () => {
  it("discards and does not clear pending when generation is stale", () => {
    expect(
      resolveLoadOriginalAfterAwait({
        startedGen: 1,
        currentGen: 2,
        draft: pageMd
      })
    ).toEqual({ apply: false, clearPending: false })
  })

  it("discards but clears pending when this generation is current and draft is gone", () => {
    expect(
      resolveLoadOriginalAfterAwait({
        startedGen: 3,
        currentGen: 3,
        draft: null
      })
    ).toEqual({ apply: false, clearPending: true })
  })

  it("discards but clears pending when this generation is current and draft is a record", () => {
    expect(
      resolveLoadOriginalAfterAwait({
        startedGen: 4,
        currentGen: 4,
        draft: record
      })
    ).toEqual({ apply: false, clearPending: true })
  })

  it("applies and clears pending when generation matches a page draft", () => {
    expect(
      resolveLoadOriginalAfterAwait({
        startedGen: 5,
        currentGen: 5,
        draft: pageMd
      })
    ).toEqual({ apply: true, clearPending: true })
  })
})

describe("applySimplify", () => {
  it("converts current html body locally without needing a tab read", () => {
    const next = applySimplify(
      pageHtml,
      "<html><head><title>T</title></head><body><main><h1>Hi</h1></main></body></html>"
    )
    expect(pageContentFormat(next)).toBe("markdown")
    expect(next.markdown).toContain("Hi")
    expect(next.markdown).toContain("标题：T")
    expect(next.html).toBeUndefined()
    expect(pageHtml.html).toBe("<p>正文</p><script>x()</script>")
  })

  it("uses the edited body text rather than the stored html field", () => {
    const next = applySimplify(pageHtml, "<main><p>编辑后</p></main>")
    expect(next.markdown).toContain("编辑后")
    expect(next.markdown).not.toContain("正文")
  })
})

describe("applyStrip", () => {
  it("strips hard noise and stays in html format", () => {
    const next = applyStrip(
      pageHtml,
      "<p>a</p><script>x()</script><svg></svg>"
    )
    expect(pageContentFormat(next)).toBe("html")
    expect(next.html).toContain("a")
    expect(next.html).not.toContain("script")
    expect(next.html).not.toContain("svg")
    expect(next.markdown).toBeUndefined()
  })
})
