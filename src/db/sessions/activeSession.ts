export const ACTIVE_SESSION_ID_KEY = "local-brain-db.activeSessionId"

export async function getActiveSessionId(): Promise<string | null> {
  const result = await chrome.storage.local.get(ACTIVE_SESSION_ID_KEY)
  const value = result[ACTIVE_SESSION_ID_KEY]
  return typeof value === "string" && value ? value : null
}

export async function setActiveSessionId(id: string | null): Promise<void> {
  if (id == null) {
    await chrome.storage.local.remove(ACTIVE_SESSION_ID_KEY)
    return
  }
  await chrome.storage.local.set({ [ACTIVE_SESSION_ID_KEY]: id })
}
