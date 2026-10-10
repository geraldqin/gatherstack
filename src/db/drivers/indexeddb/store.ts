import { PRIMARY_DRIVER } from "../kinds"
import type { PrimaryStore } from "../types"
import { createLocalBrainDexie, type LocalBrainDexie } from "./dexieDb"
import type { CollectedRecord } from "../../records/types"

export function createIndexedDbPrimaryStore(
  db: LocalBrainDexie = createLocalBrainDexie()
): PrimaryStore {
  return {
    kind: PRIMARY_DRIVER,
    async insert(record: CollectedRecord): Promise<void> {
      await db.records.put(record)
    },
    async update(record: CollectedRecord): Promise<void> {
      await db.records.put(record)
    },
    async getById(id: string): Promise<CollectedRecord | undefined> {
      return db.records.get(id)
    },
    async list(): Promise<CollectedRecord[]> {
      return db.records.orderBy("createdAt").reverse().toArray()
    },
    async deleteById(id: string): Promise<void> {
      await db.records.delete(id)
    },
    async close(): Promise<void> {
      db.close()
    }
  }
}
