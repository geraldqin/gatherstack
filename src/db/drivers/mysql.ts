import type { SyncSink } from "./types"
import { createUnimplementedSyncSink } from "./unimplementedSink"

/** Placeholder: direct MySQL (likely via local bridge). Not implemented. */
export function createMysqlSyncSink(): SyncSink {
  return createUnimplementedSyncSink("mysql")
}
