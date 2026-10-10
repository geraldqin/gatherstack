import { t } from "~shared/i18n"

export const PENDING_DRAFT_ATTACHMENT_KEY =
  "local-brain-db.pendingDraftAttachment"

export type PendingDraftAttachment = {
  recordIds: string[]
}

export function parsePendingDraftAttachment(value: unknown): string[] | null {
  if (!value || typeof value !== "object") {
    return null
  }
  const recordIds = (value as { recordIds?: unknown }).recordIds
  if (Array.isArray(recordIds)) {
    const ids = recordIds.filter(
      (id): id is string => typeof id === "string" && id.length > 0
    )
    return ids.length > 0 ? ids : null
  }
  const recordId = (value as { recordId?: unknown }).recordId
  return typeof recordId === "string" && recordId ? [recordId] : null
}

export async function setPendingDraftAttachment(
  recordIds: string[]
): Promise<void> {
  await chrome.storage.session.set({
    [PENDING_DRAFT_ATTACHMENT_KEY]: { recordIds }
  })
}

export async function consumePendingDraftAttachment(): Promise<
  string[] | null
> {
  const result = await chrome.storage.session.get(PENDING_DRAFT_ATTACHMENT_KEY)
  const recordIds = parsePendingDraftAttachment(
    result[PENDING_DRAFT_ATTACHMENT_KEY]
  )
  if (!recordIds) {
    return null
  }
  await chrome.storage.session.remove(PENDING_DRAFT_ATTACHMENT_KEY)
  return recordIds
}

export function subscribePendingDraftAttachment(
  listener: (recordIds: string[]) => void
): () => void {
  function onChanged(
    changes: Record<string, { newValue?: unknown }>,
    areaName: string
  ) {
    if (areaName !== "session" || !(PENDING_DRAFT_ATTACHMENT_KEY in changes)) {
      return
    }
    const recordIds = parsePendingDraftAttachment(
      changes[PENDING_DRAFT_ATTACHMENT_KEY].newValue
    )
    if (recordIds) {
      listener(recordIds)
    }
  }

  chrome.storage.onChanged.addListener(onChanged)
  return () => {
    chrome.storage.onChanged.removeListener(onChanged)
  }
}

/** Write pending record ids, then open the side panel (call from a click). */
export async function exportRecordsToSidepanel(
  recordIds: string[]
): Promise<void> {
  if (recordIds.length === 0) {
    throw new Error(t("errorExportNoSelection"))
  }
  await setPendingDraftAttachment(recordIds)
  const win = await chrome.windows.getCurrent()
  if (win.id == null) {
    throw new Error(t("errorExportSidepanelOpenFailed"))
  }
  await chrome.sidePanel.open({ windowId: win.id })
}

export async function exportRecordToSidepanel(recordId: string): Promise<void> {
  await exportRecordsToSidepanel([recordId])
}
