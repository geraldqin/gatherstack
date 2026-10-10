import { describe, expect, it } from "vitest"

import { buildOptionsUrl, coerceSettingsSection } from "./openOptions"

describe("coerceSettingsSection", () => {
  it("maps async-parse to send-mode", () => {
    expect(coerceSettingsSection("async-parse")).toBe("send-mode")
  })

  it("maps hidden external-db to model", () => {
    expect(coerceSettingsSection("external-db")).toBe("model")
  })

  it("passes through visible sections", () => {
    expect(coerceSettingsSection("model")).toBe("model")
    expect(coerceSettingsSection("send-mode")).toBe("send-mode")
    expect(coerceSettingsSection(null)).toBe(null)
  })
})

describe("buildOptionsUrl", () => {
  const getUrl = (path: string) => `chrome-extension://ext/${path}`

  it("returns bare options when no params", () => {
    expect(buildOptionsUrl(getUrl)).toBe("chrome-extension://ext/options.html")
  })

  it("deep-links to a skill", () => {
    expect(
      buildOptionsUrl(getUrl, { skillId: "abc-1" })
    ).toBe(
      "chrome-extension://ext/options.html?nav=skill&skillId=abc-1"
    )
  })

  it("sets nav only", () => {
    expect(buildOptionsUrl(getUrl, { nav: "settings" })).toBe(
      "chrome-extension://ext/options.html?nav=settings"
    )
  })

  it("deep-links to settings send-mode section", () => {
    expect(
      buildOptionsUrl(getUrl, {
        nav: "settings",
        settingsSection: "send-mode"
      })
    ).toBe(
      "chrome-extension://ext/options.html?nav=settings&section=send-mode"
    )
  })

  it("still accepts legacy async-parse section", () => {
    expect(
      buildOptionsUrl(getUrl, {
        nav: "settings",
        settingsSection: "async-parse"
      })
    ).toBe(
      "chrome-extension://ext/options.html?nav=settings&section=async-parse"
    )
  })

  it("implies settings nav when only settingsSection is set", () => {
    expect(
      buildOptionsUrl(getUrl, { settingsSection: "send-mode" })
    ).toBe(
      "chrome-extension://ext/options.html?nav=settings&section=send-mode"
    )
  })
})
