import { afterEach, describe, expect, it, vi } from "vitest"

import { t } from "~shared/i18n"

import { asyncParseJobPreview } from "./jobPreview"

describe("asyncParseJobPreview", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("prefers skill name and first text line", () => {
    vi.stubGlobal("chrome", {
      i18n: { getMessage: vi.fn((key: string) => key) }
    })
    expect(
      asyncParseJobPreview({
        text: "line1\nline2",
        attachment: null,
        skill: { id: "s", name: "采集", markdown: "" }
      })
    ).toBe("采集 · line1")
  })

  it("uses page label when only attachment", () => {
    vi.stubGlobal("chrome", {
      i18n: { getMessage: vi.fn((key: string) => key) }
    })
    expect(
      asyncParseJobPreview({
        text: "  ",
        attachment: { url: "https://a.com", html: "<p/>" },
        skill: null
      })
    ).toBe(t("asyncParseJobPreviewPage"))
  })
})
