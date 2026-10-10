import { describe, expect, it } from "vitest"

import type { ReadActiveTabDomResult } from "~shared/readActiveTabDom"

import {
  attachmentFromReadResult,
  decideAttachOnSelect,
  decideAttachOnSend,
  emptyPageAttachment,
  resolveRefreshAttachment
} from "./pageAttach"

describe("emptyPageAttachment", () => {
  it("returns url with empty markdown", () => {
    expect(emptyPageAttachment("https://ex.com")).toEqual({
      url: "https://ex.com",
      markdown: ""
    })
  })
})

describe("attachmentFromReadResult", () => {
  it("maps ok result to attachment", () => {
    const result: ReadActiveTabDomResult = {
      ok: true,
      url: "https://ex.com",
      markdown: "# hi",
      title: "Hi"
    }
    expect(attachmentFromReadResult(result, "https://fallback.com")).toEqual({
      url: "https://ex.com",
      markdown: "# hi",
      title: "Hi"
    })
  })

  it("returns empty attachment on failure", () => {
    const result: ReadActiveTabDomResult = {
      ok: false,
      errorMessage: "fail"
    }
    expect(attachmentFromReadResult(result, "https://ex.com")).toEqual({
      url: "https://ex.com",
      markdown: ""
    })
  })

  it("uses about:blank when failure and no fallback", () => {
    const result: ReadActiveTabDomResult = {
      ok: false,
      errorMessage: "fail"
    }
    expect(attachmentFromReadResult(result, "")).toEqual({
      url: "about:blank",
      markdown: ""
    })
  })
})

describe("decideAttachOnSelect", () => {
  it("noop when has attachment", () => {
    expect(
      decideAttachOnSelect({ hasAttachment: true, suppressAutoPageAttach: false })
    ).toEqual({ action: "noop" })
  })

  it("noop when suppressAutoPageAttach", () => {
    expect(
      decideAttachOnSelect({ hasAttachment: false, suppressAutoPageAttach: true })
    ).toEqual({ action: "noop" })
  })

  it("read when no attachment and not suppressed", () => {
    expect(
      decideAttachOnSelect({ hasAttachment: false, suppressAutoPageAttach: false })
    ).toEqual({ action: "read" })
  })
})

describe("decideAttachOnSend", () => {
  it("none when no attachment", () => {
    expect(
      decideAttachOnSend({ attachment: null, activeTabUrl: "https://ex.com" })
    ).toEqual({ action: "none" })
  })

  it("keep when activeTabUrl undefined", () => {
    expect(
      decideAttachOnSend({
        attachment: { url: "https://ex.com", markdown: "x" },
        activeTabUrl: undefined
      })
    ).toEqual({ action: "keep" })
  })

  it("keep when URLs equal", () => {
    expect(
      decideAttachOnSend({
        attachment: { url: "https://ex.com/a", markdown: "x" },
        activeTabUrl: "https://ex.com/a#frag"
      })
    ).toEqual({ action: "keep" })
  })

  it("refresh when URLs differ", () => {
    expect(
      decideAttachOnSend({
        attachment: { url: "https://ex.com/a", markdown: "x" },
        activeTabUrl: "https://ex.com/b"
      })
    ).toEqual({ action: "refresh" })
  })

  it("keep when active tab is not injectable (e.g. options page)", () => {
    expect(
      decideAttachOnSend({
        attachment: {
          url: "https://bj.lianjia.com/zufang/BJ1.html",
          markdown: "# 房源"
        },
        activeTabUrl:
          "chrome-extension://painmgcbjhkpnaakiljcanfhmnjpeklh/options.html"
      })
    ).toEqual({ action: "keep" })
  })
})

describe("resolveRefreshAttachment", () => {
  it("keeps previous attachment when read fails", () => {
    const previous = {
      url: "https://bj.lianjia.com/zufang/BJ1.html",
      markdown: "# 房源"
    }
    expect(
      resolveRefreshAttachment({
        previous,
        result: { ok: false, errorMessage: "restricted" },
        activeTabUrl:
          "chrome-extension://abc/options.html"
      })
    ).toEqual(previous)
  })

  it("replaces with read result when ok", () => {
    const previous = {
      url: "https://old.example/",
      markdown: "old"
    }
    expect(
      resolveRefreshAttachment({
        previous,
        result: {
          ok: true,
          url: "https://new.example/",
          markdown: "# new",
          title: "New"
        },
        activeTabUrl: "https://new.example/"
      })
    ).toEqual({
      url: "https://new.example/",
      markdown: "# new",
      title: "New"
    })
  })
})
