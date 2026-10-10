import Dexie, { type EntityTable } from "dexie"

import {
  DB_NAME,
  STORE_CHAT_SESSIONS,
  STORE_RECORDS,
  STORE_SEND_MODES,
  STORE_SKILLS
} from "../../schema"
import type { CollectedRecord } from "../../records/types"
import type { SendModeDocument } from "../../sendModes/types"
import type { ChatSession } from "../../sessions/types"
import type { SkillDocument } from "../../skills/types"

export type LocalBrainDexie = Dexie & {
  records: EntityTable<CollectedRecord, "id">
  chatSessions: EntityTable<ChatSession, "id">
  skills: EntityTable<SkillDocument, "id">
  sendModes: EntityTable<SendModeDocument, "id">
}

export function createLocalBrainDexie(): LocalBrainDexie {
  const db = new Dexie(DB_NAME) as LocalBrainDexie
  db.version(1).stores({
    [STORE_RECORDS]: "id, createdAt, sourceUrl"
  })
  db.version(2).stores({
    [STORE_RECORDS]: "id, createdAt, sourceUrl",
    [STORE_CHAT_SESSIONS]: "id, updatedAt"
  })
  db.version(3).stores({
    [STORE_RECORDS]: "id, createdAt, sourceUrl",
    [STORE_CHAT_SESSIONS]: "id, updatedAt",
    [STORE_SKILLS]: "id, updatedAt, name"
  })
  db.version(4).stores({
    [STORE_RECORDS]: "id, createdAt, sourceUrl",
    [STORE_CHAT_SESSIONS]: "id, updatedAt",
    [STORE_SKILLS]: "id, updatedAt, name, builtinId"
  })
  db.version(5).stores({
    [STORE_RECORDS]: "id, createdAt, sourceUrl",
    [STORE_CHAT_SESSIONS]: "id, updatedAt",
    [STORE_SKILLS]: "id, updatedAt, name, builtinId",
    [STORE_SEND_MODES]: "id, updatedAt, name, builtinId"
  })
  return db
}
