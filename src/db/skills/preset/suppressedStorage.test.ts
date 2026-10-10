import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  addSuppressedBuiltinIds,
  loadSuppressedBuiltinIds
} from "./suppressedStorage"

type LocalStore = Record<string, unknown>

function installChromeStorageMock() {
  const local: LocalStore = {}
  const chromeMock = {
    storage: {
      local: {
        get: vi.fn(async (key: string) => {
          if (key in local) return { [key]: local[key] }
          return {}
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          Object.assign(local, items)
        })
      }
    }
  }
  vi.stubGlobal("chrome", chromeMock)
  return local
}

describe("suppressedStorage", () => {
  beforeEach(() => {
    installChromeStorageMock()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns empty list by default", async () => {
    expect(await loadSuppressedBuiltinIds()).toEqual([])
  })

  it("adds ids idempotently", async () => {
    await addSuppressedBuiltinIds(["a", "b"])
    await addSuppressedBuiltinIds(["b", "c"])
    expect(await loadSuppressedBuiltinIds()).toEqual(["a", "b", "c"])
  })
})
