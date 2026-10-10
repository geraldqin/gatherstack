export { DriverNotImplementedError } from "./errors"
export {
  openLocalBrainDb,
  type LocalBrainDbHandle,
  type OpenLocalBrainDbOptions
} from "./openDatabase"
export {
  createRecordsRepository,
  type CollectedRecordRepository
} from "./records/repository"
export type { CollectedRecord } from "./records/types"
export { normalizeRecordPayload } from "./records/normalizePayload"
export {
  DB_NAME,
  DB_VERSION,
  MAX_SESSION_BYTES,
  MAX_SESSION_MESSAGES,
  MAX_SESSIONS,
  STORE_CHAT_SESSIONS,
  STORE_RECORDS,
  STORE_SEND_MODES,
  STORE_SKILLS,
  TITLE_MAX
} from "./schema"
export type {
  BuiltinSendModeId,
  SendModeDocument,
  SendModeFlags,
  SendModeOrigin
} from "./sendModes/types"
export {
  createSendModesRepository,
  type SendModesRepository
} from "./sendModes/repository"
export {
  clampMaxConcurrent,
  DEFAULT_MAX_CONCURRENT,
  MAX_MAX_CONCURRENT,
  MIN_MAX_CONCURRENT,
  normalizeSendModeDocument,
  normalizeSendModeFlags
} from "./sendModes/normalize"
export { runSendModePresetSeed } from "./sendModes/preset/runSendModePresetSeed"
export {
  addSuppressedSendModeBuiltinIds,
  loadSuppressedSendModeBuiltinIds
} from "./sendModes/preset/suppressedStorage"
export type { SkillDocument, SkillOrigin } from "./skills/types"
export {
  createSkillsRepository,
  type SkillsRepository
} from "./skills/repository"
export { normalizeSkillDocument } from "./skills/normalize"
export { runSkillPresetSeed } from "./skills/preset/runSkillPresetSeed"
export {
  addSuppressedBuiltinIds,
  loadSuppressedBuiltinIds
} from "./skills/preset/suppressedStorage"
export {
  MAX_SKILL_MARKDOWN_BYTES,
  getUnnamedSkillName,
  getDefaultNewSkillName,
  buildDefaultSkillMarkdown,
  parseSkillFrontmatter,
  sanitizeSkillFilename,
  skillBodyFromMarkdown,
  withSkillFrontmatterName
} from "./skills/markdown"
export { titleFromMessages, trimSession, type TrimLimits } from "./sessions/trimSession"
export {
  ACTIVE_SESSION_ID_KEY,
  getActiveSessionId,
  setActiveSessionId
} from "./sessions/activeSession"
export {
  createSessionsRepository,
  type ChatSessionSummary,
  type CreateSessionResult,
  type SessionsRepository
} from "./sessions/repository"
export type {
  ChatSession,
  ChatSessionInput,
  ChatMessageInput,
  PersistedChatMessage,
  PersistedDraftSkill,
  PersistedPageRef
} from "./sessions/types"
export {
  PRIMARY_DRIVER,
  SYNC_DRIVER_KINDS,
  type PrimaryDriverKind,
  type SyncDriverKind,
  type StorageDriverKind
} from "./drivers/kinds"
export type { PrimaryStore, SyncSink } from "./drivers/types"
export { createSyncSink } from "./drivers/createSyncSink"
export { createMysqlSyncSink } from "./drivers/mysql"
export { createPostgreSyncSink } from "./drivers/postgre"
export { createRemoteApiSyncSink } from "./drivers/remoteApi"
