import { describe, expect, it, vi } from "vitest"

import {
  ON_DEVICE_INTERNALS_URL,
  openOnDeviceInternals
} from "./openOnDeviceInternals"

describe("openOnDeviceInternals", () => {
  it("returns opened when the tab can be created", async () => {
    const createTab = vi.fn().mockResolvedValue({})
    await expect(openOnDeviceInternals({ createTab })).resolves.toBe("opened")
    expect(createTab).toHaveBeenCalledWith(ON_DEVICE_INTERNALS_URL)
  })

  it("copies the URL when chrome:// navigation is blocked", async () => {
    const createTab = vi.fn().mockRejectedValue(new Error("blocked"))
    const writeClipboard = vi.fn().mockResolvedValue(undefined)
    await expect(
      openOnDeviceInternals({ createTab, writeClipboard })
    ).resolves.toBe("copied")
    expect(writeClipboard).toHaveBeenCalledWith(ON_DEVICE_INTERNALS_URL)
  })

  it("returns failed when open and clipboard both fail", async () => {
    const createTab = vi.fn().mockRejectedValue(new Error("blocked"))
    const writeClipboard = vi.fn().mockRejectedValue(new Error("denied"))
    await expect(
      openOnDeviceInternals({ createTab, writeClipboard })
    ).resolves.toBe("failed")
  })
})
