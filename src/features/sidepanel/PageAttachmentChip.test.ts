import { describe, expect, it } from "vitest"

import { attachmentBody } from "./attachmentBody"

describe("attachmentBody", () => {
  it("returns markdown for page attachments", () => {
    expect(
      attachmentBody({
        url: "https://example.com/list",
        markdown: "# 标题\n\n正文"
      })
    ).toBe("# 标题\n\n正文")
  })

  it("returns empty string when page markdown is missing", () => {
    expect(attachmentBody({ url: "https://example.com/list" })).toBe("")
  })

  it("returns html for page attachments when contentFormat is html", () => {
    expect(
      attachmentBody({
        url: "https://example.com/list",
        contentFormat: "html",
        html: "<p>正文</p>"
      })
    ).toBe("<p>正文</p>")
  })

  it("returns html for record attachments", () => {
    expect(
      attachmentBody({
        url: "https://example.com/item",
        html: '{"id":"r1"}',
        kind: "record",
        title: "示例"
      })
    ).toBe('{"id":"r1"}')
  })

  it("ignores markdown on record attachments", () => {
    expect(
      attachmentBody({
        url: "https://example.com/item",
        markdown: "# no",
        html: "{}",
        kind: "record"
      })
    ).toBe("{}")
  })
})
