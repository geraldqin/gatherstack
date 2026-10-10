import type { SyncSink } from "./types"
import { createUnimplementedSyncSink } from "./unimplementedSink"

/** Placeholder: direct PostgreSQL (likely via local bridge). Not implemented. */
export function createPostgreSyncSink(): SyncSink {
  return createUnimplementedSyncSink("postgre")
}
