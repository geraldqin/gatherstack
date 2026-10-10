import { readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import { afterEach, describe, expect, it, vi } from "vitest"

import { applyExtensionDocumentTitle, resolveLocaleId, t } from "./i18n"

const localesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../locales"
)

const LOCALE_IDS = ["en", "zh_CN", "zh_TW", "zh_HK"] as const

function loadMessages(locale: string): Record<
  string,
  { message?: string; placeholders?: Record<string, { content: string }> }
> {
  return JSON.parse(
    readFileSync(join(localesDir, locale, "messages.json"), "utf8")
  )
}

describe("locales messages.json", () => {
  const maps = Object.fromEntries(
    LOCALE_IDS.map((id) => [id, loadMessages(id)])
  ) as Record<(typeof LOCALE_IDS)[number], ReturnType<typeof loadMessages>>

  const enKeys = Object.keys(maps.en).sort()

  it("all locales share the same key set", () => {
    for (const id of LOCALE_IDS) {
      expect(Object.keys(maps[id]).sort()).toEqual(enKeys)
    }
  })

  it("every entry has a non-empty message", () => {
    for (const id of LOCALE_IDS) {
      for (const key of enKeys) {
        const msg = maps[id][key]?.message
        expect(msg, `${id}.${key}`).toBeTypeOf("string")
        expect(msg!.length, `${id}.${key}`).toBeGreaterThan(0)
      }
    }
  })

  it("zh_TW and zh_HK messages are identical", () => {
    for (const key of enKeys) {
      expect(maps.zh_HK[key]?.message).toBe(maps.zh_TW[key]?.message)
    }
  })

  it("placeholder tokens have matching placeholders blocks", () => {
    for (const id of LOCALE_IDS) {
      for (const key of enKeys) {
        const entry = maps[id][key]
        const tokens = [...(entry.message?.matchAll(/\$([A-Z0-9_]+)\$/g) ?? [])]
          .map((m) => m[1])
          .filter((name) => name && !/^\d+$/.test(name))
        if (tokens.length === 0) continue
        expect(entry.placeholders, `${id}.${key} placeholders`).toBeTruthy()
        for (const name of tokens) {
          expect(
            entry.placeholders?.[name]?.content,
            `${id}.${key}.placeholders.${name}`
          ).toMatch(/^\$\d+$/)
        }
      }
    }
  })

  it("Chrome-style $name$ placeholders are all defined", () => {
    const isValidName = (name: string) =>
      name.length > 0 && /^[A-Za-z0-9_@]+$/.test(name)

    const replacePlaceholders = (
      label: string,
      message: string,
      placeholders: Record<string, string>
    ): string => {
      const vars = Object.fromEntries(
        Object.entries(placeholders).map(([k, v]) => [k.toLowerCase(), v])
      )
      let beg = 0
      while (true) {
        const found = message.indexOf("$", beg)
        if (found < 0) return message
        beg = found + 1
        if (beg >= message.length) return message
        const end = message.indexOf("$", beg)
        if (end < 0) return message
        const varName = message.slice(beg, end)
        if (!isValidName(varName)) continue
        const value = vars[varName.toLowerCase()]
        expect(value, `${label} $${varName}$`).toBeTypeOf("string")
        message = message.slice(0, found) + String(value) + message.slice(end + 1)
        beg = found + String(value).length
      }
    }

    for (const id of LOCALE_IDS) {
      for (const key of enKeys) {
        const entry = maps[id][key]
        const placeholders: Record<string, string> = {}
        for (const [name, meta] of Object.entries(entry.placeholders ?? {})) {
          placeholders[name] = meta.content
        }
        replacePlaceholders(`${id}.${key}`, entry.message ?? "", placeholders)
      }
    }
  })
})

describe("extension HTML templates", () => {
  const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..")

  it("do not embed __MSG_ tokens Chrome will not substitute in HTML", () => {
    for (const file of ["options.html", "sidepanel.html"]) {
      const html = readFileSync(join(srcDir, file), "utf8")
      expect(html, file).not.toMatch(/__MSG_/)
      expect(html, file).toMatch(/<title>/i)
    }
  })
})

describe("t()", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns getMessage result when non-empty", () => {
    vi.stubGlobal("chrome", {
      i18n: {
        getMessage: vi.fn(() => "Hello")
      }
    })
    expect(t("commonRetry")).toBe("Hello")
    expect(chrome.i18n.getMessage).toHaveBeenCalledWith("commonRetry", undefined)
  })

  it("passes substitutions through", () => {
    vi.stubGlobal("chrome", {
      i18n: {
        getMessage: vi.fn(() => "Hi Alice")
      }
    })
    expect(t("commonSelectItemAria", ["Alice"])).toBe("Hi Alice")
    expect(chrome.i18n.getMessage).toHaveBeenCalledWith("commonSelectItemAria", [
      "Alice"
    ])
  })

  it("falls back to key when getMessage returns empty and catalog misses", () => {
    vi.stubGlobal("chrome", {
      i18n: {
        getMessage: vi.fn(() => ""),
        getUILanguage: vi.fn(() => "en")
      }
    })
    expect(t("missingKey")).toBe("missingKey")
  })

  it("falls back to bundled catalog when getMessage returns empty", () => {
    vi.stubGlobal("chrome", {
      i18n: {
        getMessage: vi.fn(() => ""),
        getUILanguage: vi.fn(() => "zh-CN")
      }
    })
    expect(t("sendModeAsyncParseLabel")).toBe("异步解析")
    expect(t("sendModeOneClickCollectLabel")).toBe("一键采集")
    expect(t("sendModeBulkDeleteConfirm", ["2"])).toBe(
      "确定删除已选的 2 个发送方式？此操作不可恢复。"
    )
    expect(t("optionsAboutVersion", ["0.0.1"])).toBe("版本 0.0.1")
    expect(t("optionsAboutBuiltWith")).toBe("Built with Cursor")
    expect(t("optionsAboutContactHeading")).toBe("帮我做得更好！")
    expect(
      t("optionsAboutContact", ["sxqsdbu@gmail.com", "GatherStack-"])
    ).toBe(
      "如果你有任何建议，或发现了 bug，欢迎写信到 sxqsdbu@gmail.com。很期待你的来信！来信主题务必使用前缀 GatherStack-。"
    )
    expect(t("optionsAboutFreeHeading")).toBe("为什么免费？")
    expect(t("optionsAboutPaidHeading")).toBe("以后会收费吗？")
    expect(t("optionsAboutHowStep1", ["设置", "模型"])).toBe(
      "打开「设置 → 模型」，填一个外部模型（DeepSeek / OpenAI / 通义 / Claude 等），或加载浏览器内置 Gemini Nano。"
    )
    expect(t("optionsAboutHowStep4", ["存储", "数据", "导出到侧栏"])).toBe(
      "模型返回解析结果后点气泡上的「存储」。到左侧「数据」里查看、编辑；需要再问模型时，可把记录「导出到侧栏」。"
    )
    expect(t("optionsAboutSendModeAsync", ["异步解析"])).toBe(
      "异步解析：可以解析多个网页，同时最多处理 5 个。"
    )
  })

  it("applyExtensionDocumentTitle uses extensionName", () => {
    const holder = { value: "" }
    vi.stubGlobal("document", {
      get title() {
        return holder.value
      },
      set title(v: string) {
        holder.value = v
      }
    })
    vi.stubGlobal("chrome", {
      i18n: {
        getMessage: vi.fn(() => "GatherStack")
      }
    })
    applyExtensionDocumentTitle()
    expect(holder.value).toBe("GatherStack")
    expect(chrome.i18n.getMessage).toHaveBeenCalledWith(
      "extensionName",
      undefined
    )
  })
})

describe("resolveLocaleId", () => {
  it("maps chrome UI languages to locale folder ids", () => {
    expect(resolveLocaleId("zh-CN")).toBe("zh_CN")
    expect(resolveLocaleId("zh_TW")).toBe("zh_TW")
    expect(resolveLocaleId("en-US")).toBe("en")
    expect(resolveLocaleId("fr")).toBe("en")
  })
})
