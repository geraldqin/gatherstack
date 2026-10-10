import type { LocalBrainDexie } from "../drivers/indexeddb/dexieDb"
import { createLocalBrainDexie } from "../drivers/indexeddb/dexieDb"
import { normalizeSendModeDocument } from "./normalize"
import type { SendModeDocument } from "./types"

export type SendModesRepository = {
  list(): Promise<SendModeDocument[]>
  getById(id: string): Promise<SendModeDocument | undefined>
  upsert(doc: SendModeDocument): Promise<void>
  deleteById(id: string): Promise<void>
}

export function createSendModesRepository(
  db: LocalBrainDexie = createLocalBrainDexie()
): SendModesRepository {
  return {
    async list(): Promise<SendModeDocument[]> {
      const rows = await db.sendModes.orderBy("updatedAt").reverse().toArray()
      return rows.map((row) => normalizeSendModeDocument(row))
    },
    async getById(id: string): Promise<SendModeDocument | undefined> {
      const row = await db.sendModes.get(id)
      return row ? normalizeSendModeDocument(row) : undefined
    },
    async upsert(doc: SendModeDocument): Promise<void> {
      await db.sendModes.put(normalizeSendModeDocument(doc))
    },
    async deleteById(id: string): Promise<void> {
      await db.sendModes.delete(id)
    }
  }
}
