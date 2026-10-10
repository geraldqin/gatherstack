import { Window } from "happy-dom"
import { describe, expect, it, vi } from "vitest"

import {
  getReadDomFail,
  getReadDomNoTab,
  getReadDomRestricted
} from "./readActiveTabDom"
import {
  captureDocumentOuterHtml,
  readActiveTabOuterHtml
} from "./readActiveTabOuterHtml"

describe("captureDocumentOuterHtml", () => {
  it("returns documentElement outerHTML", () => {
    const window = new Window()
    window.document.write(
      "<!DOCTYPE html><html><head></head><body><p>raw</p></body></html>"
    )
    vi.stubGlobal("document", window.document)
    const html = captureDocumentOuterHtml()
    expect(html).toContain("<p>raw</p>")
    expect(html.toLowerCase()).toMatch(/^<html/)
    vi.unstubAllGlobals()
  })
})

describe("readActiveTabOuterHtml", () => {
  it("fails when there is no active tab", async () => {
    const executeOuterHtml = vi.fn()
    const result = await readActiveTabOuterHtml({
      queryActiveTab: async () => undefined,
      executeOuterHtml
    })
    expect(result).toEqual({ ok: false, errorMessage: getReadDomNoTab() })
    expect(executeOuterHtml).not.toHaveBeenCalled()
  })

  it("does not inject on restricted urls", async () => {
    const executeOuterHtml = vi.fn()
    const result = await readActiveTabOuterHtml({
      queryActiveTab: async () => ({ id: 1, url: "chrome://extensions" }),
      executeOuterHtml
    })
    expect(result).toEqual({
      ok: false,
      errorMessage: getReadDomRestricted()
    })
    expect(executeOuterHtml).not.toHaveBeenCalled()
  })

  it("returns outer html from active tab", async () => {
    const result = await readActiveTabOuterHtml({
      queryActiveTab: async () => ({ id: 7, url: "https://example.com/" }),
      executeOuterHtml: async (tabId) => {
        expect(tabId).toBe(7)
        return "<html><body><p>raw page</p></body></html>"
      }
    })
    expect(result).toEqual({
      ok: true,
      url: "https://example.com/",
      html: "<html><body><p>raw page</p></body></html>"
    })
  })

  it("fails when executeScript returns empty", async () => {
    const result = await readActiveTabOuterHtml({
      queryActiveTab: async () => ({ id: 2, url: "https://example.com/" }),
      executeOuterHtml: async () => undefined
    })
    expect(result).toEqual({ ok: false, errorMessage: getReadDomFail() })
  })

  it("fails when outer html is blank", async () => {
    const result = await readActiveTabOuterHtml({
      queryActiveTab: async () => ({ id: 2, url: "https://example.com/" }),
      executeOuterHtml: async () => "   "
    })
    expect(result).toEqual({ ok: false, errorMessage: getReadDomFail() })
  })

  it("fails when executeScript throws", async () => {
    const result = await readActiveTabOuterHtml({
      queryActiveTab: async () => ({ id: 2, url: "https://example.com/" }),
      executeOuterHtml: async () => {
        throw new Error("blocked")
      }
    })
    expect(result).toEqual({ ok: false, errorMessage: getReadDomFail() })
  })

  it("fails when querying the active tab throws", async () => {
    const executeOuterHtml = vi.fn()
    const result = await readActiveTabOuterHtml({
      queryActiveTab: async () => {
        throw new Error("no permission")
      },
      executeOuterHtml
    })
    expect(result).toEqual({ ok: false, errorMessage: getReadDomFail() })
    expect(executeOuterHtml).not.toHaveBeenCalled()
  })
})
