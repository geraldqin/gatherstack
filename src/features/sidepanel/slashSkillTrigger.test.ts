import { describe, expect, it } from "vitest"

import {
  applySkillSelection,
  detectSlashSkillTrigger,
  filterSkillsByQuery
} from "./slashSkillTrigger"

describe("detectSlashSkillTrigger", () => {
  it("detects leading slash", () => {
    expect(detectSlashSkillTrigger("/")).toEqual({
      start: 0,
      end: 1,
      query: ""
    })
  })

  it("detects slash after space with query", () => {
    expect(detectSlashSkillTrigger("请 /租")).toEqual({
      start: 2,
      end: 4,
      query: "租"
    })
  })

  it("returns null when slash is mid-word", () => {
    expect(detectSlashSkillTrigger("a/b")).toBeNull()
  })
})

describe("filterSkillsByQuery", () => {
  const skills = [
    { id: "1", name: "租房对比采集" },
    { id: "2", name: "租房避坑评估" }
  ]

  it("filters by substring", () => {
    expect(filterSkillsByQuery(skills, "评估").map((s) => s.id)).toEqual(["2"])
  })

  it("returns all when query empty", () => {
    expect(filterSkillsByQuery(skills, "")).toHaveLength(2)
  })
})

describe("applySkillSelection", () => {
  it("removes the slash token", () => {
    expect(
      applySkillSelection("请 /租", { start: 2, end: 4, query: "租" })
    ).toBe("请")
  })
})
