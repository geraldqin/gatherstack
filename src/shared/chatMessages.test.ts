import { describe, expect, it } from "vitest"

import { PAGE_MARKDOWN_LLM_MAX_CHARS } from "./truncateForLlm"
import {
  attachmentChipLabel,
  buildSendMessages,
  pageAttachmentLabel,
  toApiMessages,
  type ChatMessage
} from "./chatMessages"

describe("pageAttachmentLabel", () => {
  it("uses the hostname plus .md", () => {
    expect(pageAttachmentLabel("https://bj.lianjia.com/ershoufang/")).toBe(
      "bj.lianjia.com.md"
    )
  })

  it("falls back when the url is invalid", () => {
    expect(pageAttachmentLabel("not a url")).toBe("page.md")
  })
})

describe("attachmentChipLabel", () => {
  it("uses tab title.md for page attachments when title is set", () => {
    expect(
      attachmentChipLabel({
        url: "https://bj.lianjia.com/ershoufang/",
        title: "精装两居 朝南",
        markdown: ""
      })
    ).toBe("精装两居 朝南.md")
  })

  it("falls back to hostname.md when page title is missing", () => {
    expect(
      attachmentChipLabel({
        url: "https://bj.lianjia.com/ershoufang/",
        markdown: ""
      })
    ).toBe("bj.lianjia.com.md")
  })

  it("uses title.json for exported records", () => {
    expect(
      attachmentChipLabel({
        url: "https://example.com/",
        html: "{}",
        kind: "record",
        title: "示例房源"
      })
    ).toBe("示例房源.json")
  })

  it("uses title.html when contentFormat is html", () => {
    expect(
      attachmentChipLabel({
        url: "https://bj.lianjia.com/",
        title: "列表页",
        contentFormat: "html",
        html: "<html></html>"
      })
    ).toBe("列表页.html")
  })

  it("uses .html suffix on hostname when contentFormat is html and title missing", () => {
    expect(
      attachmentChipLabel({
        url: "https://bj.lianjia.com/",
        contentFormat: "html",
        html: "<html></html>"
      })
    ).toBe("bj.lianjia.com.html")
  })
})

describe("toApiMessages", () => {
  it("skips empty assistant bubbles and drops UI fields", () => {
    const messages: ChatMessage[] = [
      { id: "1", role: "user", content: "hi" },
      { id: "2", role: "assistant", content: "", status: "streaming" }
    ]
    expect(toApiMessages(messages)).toEqual([{ role: "user", content: "hi" }])
  })

  it("includes stopped assistant text and omits errorMessage", () => {
    const messages: ChatMessage[] = [
      { id: "1", role: "user", content: "hi" },
      {
        id: "2",
        role: "assistant",
        content: "partial",
        status: "error",
        errorMessage: "请求失败，请重试"
      }
    ]
    expect(toApiMessages(messages)).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: "partial" }
    ])
  })

  it("inlines page markdown when the user message has only an attachment", () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "",
        attachment: {
          url: "https://bj.lianjia.com/",
          markdown: "# 房\n\n正文"
        }
      }
    ]
    const content = toApiMessages(messages)[0]?.content ?? ""
    expect(content).toContain("当前网页：https://bj.lianjia.com/")
    expect(content).toContain("```markdown")
    expect(content).toContain("# 房")
    expect(content).toContain("正文")
    expect(content).not.toContain("```html")
  })

  it("puts typed text before the page markdown block", () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "总结这一页",
        attachment: {
          url: "https://example.com/",
          markdown: "x"
        }
      }
    ]
    expect(toApiMessages(messages)).toEqual([
      {
        role: "user",
        content:
          "总结这一页\n\n当前网页：https://example.com/\n\n```markdown\nx\n```"
      }
    ])
  })

  it("keeps full markdown only on the latest user turn", () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "总结这一页",
        attachment: {
          url: "https://example.com/",
          markdown: "huge"
        }
      },
      {
        id: "2",
        role: "assistant",
        content: "这是摘要",
        status: "complete"
      },
      { id: "3", role: "user", content: "再简短一点" }
    ]
    expect(toApiMessages(messages)).toEqual([
      {
        role: "user",
        content:
          "总结这一页\n\n当前网页：https://example.com/\n（已读取网页，正文未再次附上）"
      },
      { role: "assistant", content: "这是摘要" },
      { role: "user", content: "再简短一点" }
    ])
  })

  it("sends html fence without stripping script when contentFormat is html", () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "",
        attachment: {
          url: "https://example.com/",
          contentFormat: "html",
          html: "<script>x()</script><p>hi</p>"
        }
      }
    ]
    const content = toApiMessages(messages)[0]?.content ?? ""
    expect(content).toContain("```html")
    expect(content).toContain("<script>x()</script>")
  })

  it("truncates long page markdown for llm", () => {
    const raw = "a".repeat(PAGE_MARKDOWN_LLM_MAX_CHARS + 10)
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "",
        attachment: { url: "https://example.com/", markdown: raw }
      }
    ]
    const content = toApiMessages(messages)[0]?.content ?? ""
    expect(content).toContain("```markdown")
    expect(content).toContain("a".repeat(PAGE_MARKDOWN_LLM_MAX_CHARS))
    expect(content).toContain("…（内容过长，已截断）")
    expect(content).not.toContain("a".repeat(PAGE_MARKDOWN_LLM_MAX_CHARS + 10))
  })
})

describe("buildSendMessages", () => {
  it("omits history when the latest user has an attachment", () => {
    const messages: ChatMessage[] = [
      { id: "1", role: "user", content: "旧消息" },
      { id: "2", role: "assistant", content: "旧回复", status: "complete" },
      {
        id: "3",
        role: "user",
        content: "",
        attachment: { url: "https://example.com/", markdown: "x" }
      },
      { id: "4", role: "assistant", content: "", status: "streaming" }
    ]
    expect(buildSendMessages(messages)).toEqual([
      {
        role: "user",
        content: "当前网页：https://example.com/\n\n```markdown\nx\n```"
      }
    ])
  })

  it("prepends system skill body without frontmatter", () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "",
        attachment: { url: "https://example.com/", markdown: "x" }
      }
    ]
    const skillMarkdown = `---
name: 租房对比采集
---
只输出 JSON`
    expect(buildSendMessages(messages, { skillMarkdown })).toEqual([
      { role: "system", content: "只输出 JSON" },
      {
        role: "user",
        content: "当前网页：https://example.com/\n\n```markdown\nx\n```"
      }
    ])
  })

  it("keeps multi-turn history when there is no attachment", () => {
    const messages: ChatMessage[] = [
      { id: "1", role: "user", content: "hi" },
      { id: "2", role: "assistant", content: "hello", status: "complete" },
      { id: "3", role: "user", content: "again" }
    ]
    expect(
      buildSendMessages(messages, {
        skillMarkdown: `---
name: x
---
规则`
      })
    ).toEqual([
      { role: "system", content: "规则" },
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
      { role: "user", content: "again" }
    ])
  })

  it("sends full record json without history or html slimming", () => {
    const payload = JSON.stringify(
      {
        id: "r1",
        title: "示例",
        payload: { html: "<script>x()</script><p class='a'>房</p>" }
      },
      null,
      2
    )
    const messages: ChatMessage[] = [
      { id: "1", role: "user", content: "旧消息" },
      { id: "2", role: "assistant", content: "旧回复", status: "complete" },
      {
        id: "3",
        role: "user",
        content: "",
        attachment: {
          url: "https://example.com/item",
          html: payload,
          kind: "record",
          title: "示例"
        }
      },
      { id: "4", role: "assistant", content: "", status: "streaming" }
    ]
    expect(buildSendMessages(messages)).toEqual([
      {
        role: "user",
        content:
          "本地数据：示例\n来源：https://example.com/item\n\n```json\n" +
          payload +
          "\n```"
      }
    ])
    const content = buildSendMessages(messages)[0]?.content ?? ""
    expect(content).toContain("<script>x()</script>")
    expect(content).toContain("class='a'")
  })
})
