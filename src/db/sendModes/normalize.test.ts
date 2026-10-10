import { describe, expect, it } from "vitest"

import {
  clampMaxConcurrent,
  normalizeSendModeDocument,
  normalizeSendModeFlags
} from "./normalize"

describe("normalizeSendModeFlags", () => {
  it("forces direct-store shape when callModel is false", () => {
    expect(
      normalizeSendModeFlags({
        callModel: false,
        autoSave: false,
        includeHistory: true,
        async: true,
        maxConcurrent: 10
      })
    ).toEqual({
      callModel: false,
      autoSave: true,
      includeHistory: false,
      async: false
    })
  })

  it("forces no history when async", () => {
    expect(
      normalizeSendModeFlags({
        callModel: true,
        autoSave: false,
        includeHistory: true,
        async: true,
        maxConcurrent: 3
      })
    ).toEqual({
      callModel: true,
      autoSave: false,
      includeHistory: false,
      async: true,
      maxConcurrent: 3
    })
  })

  it("clamps maxConcurrent and defaults when async", () => {
    expect(
      normalizeSendModeFlags({
        callModel: true,
        autoSave: true,
        includeHistory: false,
        async: true,
        maxConcurrent: 99
      }).maxConcurrent
    ).toBe(20)
    expect(
      normalizeSendModeFlags({
        callModel: true,
        autoSave: false,
        includeHistory: false,
        async: true
      }).maxConcurrent
    ).toBe(5)
  })

  it("drops maxConcurrent when not async", () => {
    expect(
      normalizeSendModeFlags({
        callModel: true,
        autoSave: false,
        includeHistory: true,
        async: false,
        maxConcurrent: 8
      })
    ).toEqual({
      callModel: true,
      autoSave: false,
      includeHistory: true,
      async: false
    })
  })
})

describe("clampMaxConcurrent", () => {
  it("clamps and defaults", () => {
    expect(clampMaxConcurrent(undefined)).toBe(5)
    expect(clampMaxConcurrent(0)).toBe(1)
    expect(clampMaxConcurrent(7)).toBe(7)
  })
})

describe("normalizeSendModeDocument", () => {
  it("normalizes flags on raw rows", () => {
    const doc = normalizeSendModeDocument({
      id: "1",
      name: "x",
      description: "d",
      createdAt: 1,
      updatedAt: 2,
      origin: "user",
      callModel: false,
      autoSave: false,
      includeHistory: true,
      async: true
    })
    expect(doc.autoSave).toBe(true)
    expect(doc.async).toBe(false)
    expect(doc.includeHistory).toBe(false)
  })
})
