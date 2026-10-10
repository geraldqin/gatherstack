import type { LocalBrainDbHandle } from "../openDatabase"
import type { CollectedRecord } from "./types"

export type CollectedRecordRepository = {
  insert(record: CollectedRecord): Promise<void>
  update(record: CollectedRecord): Promise<void>
  getById(id: string): Promise<CollectedRecord | undefined>
  list(): Promise<CollectedRecord[]>
  deleteById(id: string): Promise<void>
}

/**
 * Reads always from IndexedDB primary.
 * Writes: primary first, then best-effort sync sinks (failures do not roll back primary).
 */
export function createRecordsRepository(
  db: LocalBrainDbHandle
): CollectedRecordRepository {
  return {
    async insert(record: CollectedRecord): Promise<void> {
      await db.primary.insert(record)
      await settleSync(db.syncSinks.map((sink) => sink.upsert(record)))
    },
    async update(record: CollectedRecord): Promise<void> {
      await db.primary.update(record)
      await settleSync(db.syncSinks.map((sink) => sink.upsert(record)))
    },
    async getById(id: string): Promise<CollectedRecord | undefined> {
      return db.primary.getById(id)
    },
    async list(): Promise<CollectedRecord[]> {
      return db.primary.list()
    },
    async deleteById(id: string): Promise<void> {
      await db.primary.deleteById(id)
      await settleSync(db.syncSinks.map((sink) => sink.deleteById(id)))
    }
  }
}

async function settleSync(tasks: Promise<void>[]): Promise<void> {
  if (tasks.length === 0) return
  await Promise.allSettled(tasks)
}
