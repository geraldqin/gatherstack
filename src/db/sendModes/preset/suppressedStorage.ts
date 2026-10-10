const STORAGE_KEY = "sendModePreset"

type SendModePresetStorage = {
  suppressedBuiltinIds?: string[]
}

async function readBag(): Promise<SendModePresetStorage> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const value = result[STORAGE_KEY]
  if (!value || typeof value !== "object") return {}
  return value as SendModePresetStorage
}

async function writeBag(next: SendModePresetStorage): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: next })
}

export async function loadSuppressedSendModeBuiltinIds(): Promise<string[]> {
  const bag = await readBag()
  const ids = bag.suppressedBuiltinIds
  if (!Array.isArray(ids)) return []
  return ids.filter((id): id is string => typeof id === "string" && id.length > 0)
}

export async function addSuppressedSendModeBuiltinIds(
  ids: string[]
): Promise<void> {
  const incoming = ids.filter((id) => typeof id === "string" && id.length > 0)
  if (incoming.length === 0) return
  const bag = await readBag()
  const merged = new Set(await loadSuppressedSendModeBuiltinIds())
  for (const id of incoming) merged.add(id)
  await writeBag({
    ...bag,
    suppressedBuiltinIds: [...merged]
  })
}
