import type { SyncSink } from "./types"
import { createUnimplementedSyncSink } from "./unimplementedSink"

/** Placeholder: HTTP/API sync target (generic remote). Not implemented. */
export function createRemoteApiSyncSink(): SyncSink {
  return createUnimplementedSyncSink("remote-api")
}
