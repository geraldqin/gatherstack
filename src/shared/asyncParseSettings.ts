import {
  clampMaxConcurrent,
  DEFAULT_MAX_CONCURRENT,
  MAX_MAX_CONCURRENT,
  MIN_MAX_CONCURRENT
} from "~db/sendModes/normalize"

export {
  clampMaxConcurrent,
  DEFAULT_MAX_CONCURRENT,
  MAX_MAX_CONCURRENT,
  MIN_MAX_CONCURRENT
}

/** @deprecated Global async settings removed; concurrency lives on each send mode. */
export const ASYNC_PARSE_SETTINGS_KEY = "asyncParseSettings"

export type AsyncParseSettings = {
  version: 1
  maxConcurrent: number
}

export function normalizeAsyncParseSettings(raw: unknown): AsyncParseSettings {
  if (!raw || typeof raw !== "object") {
    return {
      version: 1,
      maxConcurrent: DEFAULT_MAX_CONCURRENT
    }
  }
  const record = raw as Record<string, unknown>
  return {
    version: 1,
    maxConcurrent: clampMaxConcurrent(record.maxConcurrent)
  }
}

export async function loadAsyncParseSettings(): Promise<AsyncParseSettings> {
  const stored = await chrome.storage.local.get(ASYNC_PARSE_SETTINGS_KEY)
  return normalizeAsyncParseSettings(stored[ASYNC_PARSE_SETTINGS_KEY])
}

export async function saveAsyncParseSettings(
  settings: AsyncParseSettings
): Promise<void> {
  const normalized = normalizeAsyncParseSettings(settings)
  await chrome.storage.local.set({
    [ASYNC_PARSE_SETTINGS_KEY]: normalized
  })
}
