import { describe, expect, it } from "vitest"

import { isOneClickCollectUx } from "./flags"

describe("isOneClickCollectUx", () => {
  it("true when callModel and autoSave", () => {
    expect(isOneClickCollectUx({ callModel: true, autoSave: true })).toBe(true)
  })
  it("false for chat / directStore / asyncParse flags", () => {
    expect(isOneClickCollectUx({ callModel: true, autoSave: false })).toBe(false)
    expect(isOneClickCollectUx({ callModel: false, autoSave: true })).toBe(false)
  })
})
