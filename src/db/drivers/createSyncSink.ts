import { createMysqlSyncSink } from "./mysql"
import { createPostgreSyncSink } from "./postgre"
import { createRemoteApiSyncSink } from "./remoteApi"
import type { SyncDriverKind } from "./kinds"
import type { SyncSink } from "./types"

export function createSyncSink(kind: SyncDriverKind): SyncSink {
  switch (kind) {
    case "mysql":
      return createMysqlSyncSink()
    case "postgre":
      return createPostgreSyncSink()
    case "remote-api":
      return createRemoteApiSyncSink()
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}
