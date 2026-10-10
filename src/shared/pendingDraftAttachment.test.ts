import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { chromeI18nGetMessage } from "../../vitest.setup"
import {
  consumePendingDraftAttachment,
  exportRecordsToSidepanel,
  parsePendingDraftAttachment,
  PENDING_DRAFT_ATTACHMENT_KEY,
  setPendingDraftAttachment,
  subscribePendingDraftAttachment
} from "./pendingDraftAttachment"

describe("parsePendingDraftAttachment", () => {
  it("reads a recordIds array", () => {
    expect(parsePendingDraftAttachment({ recordIds: ["r1", "r2"] })).toEqual([
      "r1",
      "r2"
    ])
    expect(parsePendingDraftAttachment({ recordId: "r1" })).toEqual(["r1"])
    expect(parsePendingDraftAttachment({})).toBeNull()
    expect(parsePendingDraftAttachment(null)).toBeNull()
  })
})

describe("pending draft attachment storage", () => {
  const storage = new Map<string, unknown>()
  const listeners: Array<
    (
      changes: Record<string, { newValue?: unknown }>,
      areaName: string
    ) => void
  > = []

  beforeEach(() => {
    storage.clear()
    listeners.length = 0
    vi.stubGlobal("chrome", {
      i18n: {
        getMessage: chromeI18nGetMessage
      },
      storage: {
        session: {
          get: vi.fn(async (key: string) => {
            const value = storage.get(key)
            return value !== undefined ? { [key]: value } : {}
          }),
          set: vi.fn(async (items: Record<string, unknown>) => {
            for (const [key, value] of Object.entries(items)) {
              storage.set(key, value)
              for (const listener of listeners) {
                listener({ [key]: { newValue: value } }, "session")
              }
            }
          }),
          remove: vi.fn(async (key: string) => {
            storage.delete(key)
          })
        },
        onChanged: {
          addListener: vi.fn((listener: (typeof listeners)[number]) => {
            listeners.push(listener)
          }),
          removeListener: vi.fn((listener: (typeof listeners)[number]) => {
            const index = listeners.indexOf(listener)
            if (index >= 0) {
              listeners.splice(index, 1)
            }
          })
        }
      },
      windows: {
        getCurrent: vi.fn(async () => ({ id: 7 }))
      },
      sidePanel: {
        open: vi.fn(async () => {})
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("sets, notifies, and consumes pending record ids", async () => {
    const seen: string[][] = []
    const unsub = subscribePendingDraftAttachment((ids) => {
      seen.push(ids)
    })

    await setPendingDraftAttachment(["rec-1"])
    expect(seen).toEqual([["rec-1"]])
    expect(await consumePendingDraftAttachment()).toEqual(["rec-1"])
    expect(await consumePendingDraftAttachment()).toBeNull()
    unsub()
  })

  it("opens the side panel after writing the pending ids", async () => {
    await exportRecordsToSidepanel(["rec-2"])
    expect(chrome.storage.session.set).toHaveBeenCalled()
    expect(chrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 7 })
    expect(storage.get(PENDING_DRAFT_ATTACHMENT_KEY)).toEqual({
      recordIds: ["rec-2"]
    })
  })
})
