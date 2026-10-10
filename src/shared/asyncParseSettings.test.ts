import { afterEach, describe, expect, it, vi } from "vitest"

import {
  ASYNC_PARSE_SETTINGS_KEY,
  DEFAULT_MAX_CONCURRENT,
  clampMaxConcurrent,
  loadAsyncParseSettings,
  normalizeAsyncParseSettings,
  saveAsyncParseSettings
} from "./asyncParseSettings"

describe("clampMaxConcurrent", () => {
  it("defaults invalid values to 5", () => {
    expect(clampMaxConcurrent(undefined)).toBe(DEFAULT_MAX_CONCURRENT)
    expect(clampMaxConcurrent(null)).toBe(DEFAULT_MAX_CONCURRENT)
    expect(clampMaxConcurrent("x")).toBe(DEFAULT_MAX_CONCURRENT)
  })

  it("clamps to 1–20", () => {
    expect(clampMaxConcurrent(0)).toBe(1)
    expect(clampMaxConcurrent(-3)).toBe(1)
    expect(clampMaxConcurrent(21)).toBe(20)
    expect(clampMaxConcurrent(7.6)).toBe(8)
  })
})

describe("normalizeAsyncParseSettings", () => {
  it("fills defaults", () => {
    expect(normalizeAsyncParseSettings(undefined)).toEqual({
      version: 1,
      maxConcurrent: 5
    })
  })

  it("clamps maxConcurrent from raw object", () => {
    expect(
      normalizeAsyncParseSettings({ version: 1, maxConcurrent: 99 })
    ).toEqual({ version: 1, maxConcurrent: 20 })
  })
})

describe("load/saveAsyncParseSettings", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("loads and saves via chrome.storage.local", async () => {
    const store: Record<string, unknown> = {}
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: store[key] })),
          set: vi.fn(async (values: Record<string, unknown>) => {
            Object.assign(store, values)
          })
        }
      }
    })

    expect(await loadAsyncParseSettings()).toEqual({
      version: 1,
      maxConcurrent: 5
    })

    await saveAsyncParseSettings({ version: 1, maxConcurrent: 3 })
    expect(store[ASYNC_PARSE_SETTINGS_KEY]).toEqual({
      version: 1,
      maxConcurrent: 3
    })
    expect(await loadAsyncParseSettings()).toEqual({
      version: 1,
      maxConcurrent: 3
    })
  })
})
