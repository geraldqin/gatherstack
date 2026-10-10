import { describe, expect, it } from "vitest"

import {
  MAX_SKILL_MARKDOWN_BYTES,
  getUnnamedSkillName,
  getDefaultNewSkillName,
  buildDefaultSkillMarkdown,
  parseSkillFrontmatter,
  sanitizeSkillFilename,
  skillBodyFromMarkdown,
  withSkillFrontmatterName
} from "./markdown"

describe("parseSkillFrontmatter", () => {
  it("reads name and description", () => {
    const md = `---
name: 示例 Skill
description: 说明
---
正文`
    expect(parseSkillFrontmatter(md)).toEqual({
      name: "示例 Skill",
      description: "说明"
    })
  })

  it("falls back when name missing", () => {
    const md = `---
description: only
---
`
    expect(parseSkillFrontmatter(md).name).toBe(getUnnamedSkillName())
  })

  it("falls back when no frontmatter", () => {
    expect(parseSkillFrontmatter("# just body").name).toBe(getUnnamedSkillName())
  })

  it("falls back on malformed fence without crashing", () => {
    expect(parseSkillFrontmatter("---\nname: [unterminated\n").name).toBe(
      getUnnamedSkillName()
    )
  })
})

describe("skillBodyFromMarkdown", () => {
  it("strips frontmatter and returns body", () => {
    const md = `---
name: 示例
---
# 目的

正文`
    expect(skillBodyFromMarkdown(md)).toBe("# 目的\n\n正文")
  })

  it("returns trimmed markdown when no frontmatter", () => {
    expect(skillBodyFromMarkdown("  # only body  ")).toBe("# only body")
  })
})

describe("buildDefaultSkillMarkdown", () => {
  it("embeds default name", () => {
    const md = buildDefaultSkillMarkdown()
    expect(md).toContain(`name: ${getDefaultNewSkillName()}`)
    expect(md.startsWith("---\n")).toBe(true)
  })

  it("embeds custom name", () => {
    expect(buildDefaultSkillMarkdown("自定义")).toContain("name: 自定义")
  })
})

describe("withSkillFrontmatterName", () => {
  it("replaces existing name", () => {
    const md = withSkillFrontmatterName(
      `---\nname: 原名\ndescription: d\n---\nbody\n`,
      "副本名"
    )
    expect(parseSkillFrontmatter(md)).toEqual({
      name: "副本名",
      description: "d"
    })
    expect(skillBodyFromMarkdown(md)).toBe("body")
  })

  it("inserts frontmatter when missing", () => {
    const md = withSkillFrontmatterName("# only body", "新名")
    expect(parseSkillFrontmatter(md).name).toBe("新名")
    expect(skillBodyFromMarkdown(md)).toBe("# only body")
  })
})

describe("sanitizeSkillFilename", () => {
  it("strips path segments and ensures .md", () => {
    expect(sanitizeSkillFilename("a/b\\c.txt")).toBe("c.md")
  })

  it("keeps basename when already .md", () => {
    expect(sanitizeSkillFilename("my-skill.md")).toBe("my-skill.md")
  })

  it("falls back when empty", () => {
    expect(sanitizeSkillFilename("   ")).toBe("skill.md")
  })
})

describe("MAX_SKILL_MARKDOWN_BYTES", () => {
  it("is 512KB", () => {
    expect(MAX_SKILL_MARKDOWN_BYTES).toBe(512 * 1024)
  })
})
