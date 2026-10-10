/** Chrome internals page where users can uninstall on-device models (e.g. Gemini Nano). */
export const ON_DEVICE_INTERNALS_URL = "chrome://on-device-internals/"

export type OpenOnDeviceInternalsResult = "opened" | "copied" | "failed"

type OpenOnDeviceInternalsDeps = {
  createTab?: (url: string) => Promise<unknown>
  writeClipboard?: (text: string) => Promise<void>
}

/**
 * Extensions cannot navigate to most chrome:// URLs. Prefer opening a tab;
 * if blocked, copy the URL so the user can paste it in the address bar.
 */
export async function openOnDeviceInternals(
  deps: OpenOnDeviceInternalsDeps = {}
): Promise<OpenOnDeviceInternalsResult> {
  const createTab =
    deps.createTab ??
    (async (url: string) => {
      await chrome.tabs.create({ url })
    })
  const writeClipboard =
    deps.writeClipboard ??
    (async (text: string) => {
      await navigator.clipboard.writeText(text)
    })

  try {
    await createTab(ON_DEVICE_INTERNALS_URL)
    return "opened"
  } catch {
    try {
      await writeClipboard(ON_DEVICE_INTERNALS_URL)
      return "copied"
    } catch {
      return "failed"
    }
  }
}
