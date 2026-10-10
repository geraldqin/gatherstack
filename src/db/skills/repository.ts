import type { LocalBrainDexie } from "../drivers/indexeddb/dexieDb"
import { createLocalBrainDexie } from "../drivers/indexeddb/dexieDb"
import { normalizeSkillDocument } from "./normalize"
import type { SkillDocument } from "./types"

export type SkillsRepository = {
  list(): Promise<SkillDocument[]>
  getById(id: string): Promise<SkillDocument | undefined>
  upsert(doc: SkillDocument): Promise<void>
  deleteById(id: string): Promise<void>
}

export function createSkillsRepository(
  db: LocalBrainDexie = createLocalBrainDexie()
): SkillsRepository {
  return {
    async list(): Promise<SkillDocument[]> {
      const rows = await db.skills.orderBy("updatedAt").reverse().toArray()
      return rows.map((row) => normalizeSkillDocument(row))
    },
    async getById(id: string): Promise<SkillDocument | undefined> {
      const row = await db.skills.get(id)
      return row ? normalizeSkillDocument(row) : undefined
    },
    async upsert(doc: SkillDocument): Promise<void> {
      await db.skills.put(normalizeSkillDocument(doc))
    },
    async deleteById(id: string): Promise<void> {
      await db.skills.delete(id)
    }
  }
}
