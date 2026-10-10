import { describe, expect, it } from "vitest"

import { parseOptionsQuery } from "./parseOptionsQuery"

describe("parseOptionsQuery", () => {
  it("defaults to data", () => {
    expect(parseOptionsQuery("")).toEqual({
      nav: "data",
      skillId: null,
      settingsSection: null
    })
  })

  it("reads nav", () => {
    expect(parseOptionsQuery("?nav=settings")).toEqual({
      nav: "settings",
      skillId: null,
      settingsSection: null
    })
  })

  it("reads settings section deep-link", () => {
    expect(
      parseOptionsQuery("?nav=settings&section=async-parse")
    ).toEqual({
      nav: "settings",
      skillId: null,
      settingsSection: "async-parse"
    })
  })

  it("reads send-mode section deep-link", () => {
    expect(
      parseOptionsQuery("?nav=settings&section=send-mode")
    ).toEqual({
      nav: "settings",
      skillId: null,
      settingsSection: "send-mode"
    })
  })

  it("forces skill nav when skillId present", () => {
    expect(parseOptionsQuery("?skillId=s1&nav=data")).toEqual({
      nav: "skill",
      skillId: "s1",
      settingsSection: null
    })
  })
})
