import { describe, expect, it } from "vitest"

import { normalizeSkillDocument } from "./normalize"

describe("normalizeSkillDocument", () => {
  it("fills defaults for legacy rows without origin fields", () => {
    const doc = normalizeSkillDocument({
      id: "1",
      name: "旧",
      filename: "old.md",
      markdown: "x",
      createdAt: 1,
      updatedAt: 2
    })
    expect(doc.origin).toBe("user")
    expect(doc.builtinId).toBeUndefined()
    expect(doc.version).toBeUndefined()
  })

  it("preserves builtin fields and drops userTouched", () => {
    const doc = normalizeSkillDocument({
      id: "1",
      name: "内置",
      filename: "a.md",
      markdown: "x",
      createdAt: 1,
      updatedAt: 2,
      origin: "builtin",
      builtinId: "rent-compare-collect",
      version: "1.0.0",
      userTouched: true
    })
    expect(doc.origin).toBe("builtin")
    expect(doc.builtinId).toBe("rent-compare-collect")
    expect(doc.version).toBe("1.0.0")
    expect("userTouched" in doc).toBe(false)
  })
})
