import { describe, expect, it } from "vitest"

import {
  collectedRecordToAttachment,
  collectedRecordsToAttachment,
  collectedRecordsToExportJson
} from "./collectedRecordAttachment"

describe("collectedRecordToAttachment", () => {
  it("exports the full record as a json chip without slimming", () => {
    const attachment = collectedRecordToAttachment({
      id: "r1",
      createdAt: 1,
      sourceUrl: "https://example.com/item",
      title: "示例房源",
      skillId: "json-from-skill",
      payload: JSON.stringify({
        html: "<script>x()</script><p class='a'>房</p>"
      })
    })

    expect(attachment.kind).toBe("record")
    expect(attachment.title).toBe("示例房源")
    expect(attachment.url).toBe("https://example.com/item")
    expect(attachment.html).toContain("<script>x()</script>")
    expect(attachment.html).toContain("class='a'")
    expect(JSON.parse(attachment.html)).toEqual({
      id: "r1",
      createdAt: 1,
      sourceUrl: "https://example.com/item",
      title: "示例房源",
      skillId: "json-from-skill",
      payload: { html: "<script>x()</script><p class='a'>房</p>" }
    })
  })

  it("uses a local-record url when sourceUrl is empty", () => {
    const attachment = collectedRecordToAttachment({
      id: "r2",
      createdAt: 2,
      sourceUrl: "",
      title: "无来源",
      skillId: "default",
      payload: "plain"
    })
    expect(attachment.url).toBe("local-record://r2")
    expect(JSON.parse(attachment.html).payload).toBe("plain")
  })

  it("bundles multiple records into one json chip", () => {
    const attachment = collectedRecordsToAttachment([
      {
        id: "a",
        createdAt: 1,
        sourceUrl: "https://a.example/",
        title: "A",
        skillId: "default",
        payload: "{}"
      },
      {
        id: "b",
        createdAt: 2,
        sourceUrl: "",
        title: "B",
        skillId: "default",
        payload: "x"
      }
    ])
    expect(attachment?.kind).toBe("record")
    expect(attachment?.title).toBe("已选 2 条")
    expect(JSON.parse(attachment?.html ?? "null")).toEqual([
      {
        id: "a",
        createdAt: 1,
        sourceUrl: "https://a.example/",
        title: "A",
        skillId: "default",
        payload: {}
      },
      {
        id: "b",
        createdAt: 2,
        sourceUrl: "",
        title: "B",
        skillId: "default",
        payload: "x"
      }
    ])
  })
})

describe("collectedRecordsToExportJson", () => {
  it("returns the same json text as the sidepanel chip html", () => {
    const record = {
      id: "r1",
      createdAt: 1,
      sourceUrl: "https://example.com/item",
      title: "示例房源",
      skillId: "json-from-skill",
      payload: JSON.stringify({ title: "示例房源" })
    }
    expect(collectedRecordsToExportJson([record])).toBe(
      collectedRecordToAttachment(record).html
    )
  })

  it("returns the bundled json text for multiple records", () => {
    const records = [
      {
        id: "a",
        createdAt: 1,
        sourceUrl: "https://a.example/",
        title: "A",
        skillId: "default",
        payload: "{}"
      },
      {
        id: "b",
        createdAt: 2,
        sourceUrl: "",
        title: "B",
        skillId: "default",
        payload: "x"
      }
    ]
    expect(collectedRecordsToExportJson(records)).toBe(
      collectedRecordsToAttachment(records)?.html
    )
  })

  it("returns null when there are no records", () => {
    expect(collectedRecordsToExportJson([])).toBeNull()
  })
})
