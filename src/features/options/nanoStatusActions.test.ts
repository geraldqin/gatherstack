import { describe, expect, it } from "vitest"

import { isNanoReloadVisible } from "./nanoStatusActions"

describe("isNanoReloadVisible", () => {
  it("is true only while downloading", () => {
    expect(isNanoReloadVisible("downloading")).toBe(true)
    expect(isNanoReloadVisible("available")).toBe(false)
    expect(isNanoReloadVisible("downloadable")).toBe(false)
    expect(isNanoReloadVisible("unavailable")).toBe(false)
  })
})
