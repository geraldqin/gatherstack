import type { CollectedRecord } from "../db/records/types"
import { t } from "~shared/i18n"
import type { PageAttachment } from "./chatMessages"

function parsePayload(payload: string): unknown {
  try {
    return JSON.parse(payload)
  } catch {
    return payload
  }
}

function recordToJson(record: CollectedRecord): Record<string, unknown> {
  return {
    id: record.id,
    createdAt: record.createdAt,
    sourceUrl: record.sourceUrl,
    title: record.title,
    skillId: record.skillId,
    payload: parsePayload(record.payload)
  }
}

/** Full record as a side-panel page-attachment chip (no HTML slim/truncate). */
export function collectedRecordToAttachment(
  record: CollectedRecord
): PageAttachment {
  return {
    url: record.sourceUrl || `local-record://${record.id}`,
    html: JSON.stringify(recordToJson(record), null, 2),
    kind: "record",
    title: record.title
  }
}

export function collectedRecordsToAttachment(
  records: CollectedRecord[]
): PageAttachment | null {
  if (records.length === 0) {
    return null
  }
  if (records.length === 1) {
    return collectedRecordToAttachment(records[0]!)
  }
  return {
    url: `local-record://bundle`,
    html: JSON.stringify(records.map(recordToJson), null, 2),
    kind: "record",
    title: t("recordSelectedBundleTitle", [String(records.length)])
  }
}

/** Same JSON text the side-panel record chip sends (attachment.html). */
export function collectedRecordsToExportJson(
  records: CollectedRecord[]
): string | null {
  return collectedRecordsToAttachment(records)?.html ?? null
}
