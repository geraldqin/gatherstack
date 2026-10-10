import { describe, expect, it, vi } from "vitest"

import {
  getReadDomFail,
  getReadDomNoTab,
  getReadDomRestricted,
  isInjectableUrl,
  readActiveTabDom
} from "./readActiveTabDom"
import { PAGE_MARKDOWN_LLM_MAX_CHARS } from "./truncateForLlm"

describe("isInjectableUrl", () => {
  it("allows http and https pages", () => {
    expect(isInjectableUrl("http://localhost:3000/")).toBe(true)
    expect(isInjectableUrl("https://example.com/path?q=1")).toBe(true)
  })

  it("rejects system, extension, file, and web store pages", () => {
    expect(isInjectableUrl(undefined)).toBe(false)
    expect(isInjectableUrl("")).toBe(false)
    expect(isInjectableUrl("chrome://extensions")).toBe(false)
    expect(isInjectableUrl("about:blank")).toBe(false)
    expect(isInjectableUrl("chrome-extension://abc/sidepanel.html")).toBe(false)
    expect(isInjectableUrl("file:///tmp/a.html")).toBe(false)
    expect(isInjectableUrl("https://chromewebstore.google.com/detail/foo")).toBe(
      false
    )
    expect(
      isInjectableUrl("https://chrome.google.com/webstore/detail/foo")
    ).toBe(false)
  })
})

describe("readActiveTabDom", () => {
  it("fails when there is no active tab", async () => {
    const executeCleanedPage = vi.fn()
    const result = await readActiveTabDom({
      queryActiveTab: async () => undefined,
      executeCleanedPage
    })
    expect(result).toEqual({ ok: false, errorMessage: getReadDomNoTab() })
    expect(executeCleanedPage).not.toHaveBeenCalled()
  })

  it("does not inject on restricted urls", async () => {
    const executeCleanedPage = vi.fn()
    const result = await readActiveTabDom({
      queryActiveTab: async () => ({ id: 1, url: "chrome://extensions" }),
      executeCleanedPage
    })
    expect(result).toEqual({
      ok: false,
      errorMessage: getReadDomRestricted()
    })
    expect(executeCleanedPage).not.toHaveBeenCalled()
  })

  it("returns markdown from cleaned page html with title prefix", async () => {
    const result = await readActiveTabDom({
      queryActiveTab: async () => ({ id: 7, url: "https://example.com/" }),
      executeCleanedPage: async (tabId) => {
        expect(tabId).toBe(7)
        return {
          title: "房源详情",
          html: "<main><h1>楼盘名</h1><p>正文内容</p></main>"
        }
      }
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.url).toBe("https://example.com/")
    expect(result.title).toBe("房源详情")
    expect(result.markdown).toContain("标题：房源详情")
    expect(result.markdown).toContain("正文内容")
  })

  it("omits title prefix when title is empty", async () => {
    const result = await readActiveTabDom({
      queryActiveTab: async () => ({ id: 7, url: "https://example.com/" }),
      executeCleanedPage: async () => ({
        title: "",
        html: "<p>仅正文</p>"
      })
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.title).toBeUndefined()
    expect(result.markdown).not.toContain("标题：")
    expect(result.markdown).toContain("仅正文")
  })

  it("fails when executeScript returns empty", async () => {
    const result = await readActiveTabDom({
      queryActiveTab: async () => ({ id: 2, url: "https://example.com/" }),
      executeCleanedPage: async () => undefined
    })
    expect(result).toEqual({ ok: false, errorMessage: getReadDomFail() })
  })

  it("fails when cleaned html is blank", async () => {
    const result = await readActiveTabDom({
      queryActiveTab: async () => ({ id: 2, url: "https://example.com/" }),
      executeCleanedPage: async () => ({ title: "有标题", html: "   " })
    })
    expect(result).toEqual({ ok: false, errorMessage: getReadDomFail() })
  })

  it("fails when markdown is empty", async () => {
    const result = await readActiveTabDom({
      queryActiveTab: async () => ({ id: 2, url: "https://example.com/" }),
      executeCleanedPage: async () => ({ title: "", html: "<div></div>" })
    })
    expect(result).toEqual({ ok: false, errorMessage: getReadDomFail() })
  })

  it("fails when executeScript throws", async () => {
    const result = await readActiveTabDom({
      queryActiveTab: async () => ({ id: 2, url: "https://example.com/" }),
      executeCleanedPage: async () => {
        throw new Error("blocked")
      }
    })
    expect(result).toEqual({ ok: false, errorMessage: getReadDomFail() })
  })

  it("fails when querying the active tab throws", async () => {
    const executeCleanedPage = vi.fn()
    const result = await readActiveTabDom({
      queryActiveTab: async () => {
        throw new Error("no permission")
      },
      executeCleanedPage
    })
    expect(result).toEqual({ ok: false, errorMessage: getReadDomFail() })
    expect(executeCleanedPage).not.toHaveBeenCalled()
  })

  it("truncates very long markdown for llm", async () => {
    const long = "字".repeat(PAGE_MARKDOWN_LLM_MAX_CHARS + 50)
    const result = await readActiveTabDom({
      queryActiveTab: async () => ({ id: 2, url: "https://example.com/" }),
      executeCleanedPage: async () => ({
        title: "",
        html: `<p>${long}</p>`
      })
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.markdown).toContain("…（内容过长，已截断）")
    expect(result.markdown.length).toBeGreaterThan(PAGE_MARKDOWN_LLM_MAX_CHARS)
  })
})
