import { describe, expect, it } from "vitest"

import {
  loadPresetCatalog,
  pickLocalizedPresetFile,
  resolveSkillPresetLocaleKey
} from "./catalog"

describe("loadPresetCatalog", () => {
  it("loads Chinese bundled preset entries", () => {
    const entries = loadPresetCatalog("zh")
    expect(entries.map((e) => e.builtinId)).toEqual([
      "rent-compare-collect",
      "rent-compare-evaluate"
    ])
    expect(entries[0]?.version).toBe("1.0.0")
    expect(entries[0]?.markdown).toContain("name: 租房对比采集")
    expect(entries[1]?.markdown).toContain("name: 租房避坑评估")
  })

  it("loads English bundled preset entries", () => {
    const entries = loadPresetCatalog("en")
    expect(entries.map((e) => e.builtinId)).toEqual([
      "rent-compare-collect",
      "rent-compare-evaluate"
    ])
    expect(entries[0]?.markdown).toContain("name: Rent listing collector")
    expect(entries[1]?.markdown).toContain("name: Rental pitfall check")
  })
})

describe("resolveSkillPresetLocaleKey", () => {
  it("maps chrome locale ids to preset locale keys", () => {
    expect(resolveSkillPresetLocaleKey("zh_CN")).toBe("zh")
    expect(resolveSkillPresetLocaleKey("zh_TW")).toBe("zh")
    expect(resolveSkillPresetLocaleKey("zh_HK")).toBe("zh")
    expect(resolveSkillPresetLocaleKey("en")).toBe("en")
    expect(resolveSkillPresetLocaleKey("en_US")).toBe("en")
    expect(resolveSkillPresetLocaleKey("fr")).toBe("en")
  })
})

describe("pickLocalizedPresetFile", () => {
  it("prefers the requested locale then falls back to en then zh", () => {
    expect(
      pickLocalizedPresetFile({ zh: "zh.md", en: "en.md" }, "en")
    ).toBe("en.md")
    expect(pickLocalizedPresetFile({ zh: "zh.md" }, "en")).toBe("zh.md")
    expect(pickLocalizedPresetFile({ en: "en.md" }, "zh")).toBe("en.md")
  })
})
