import { createIndexedDbPrimaryStore } from "./drivers/indexeddb/store"
import { createSyncSink } from "./drivers/createSyncSink"
import type { SyncDriverKind } from "./drivers/kinds"
import type { PrimaryStore, SyncSink } from "./drivers/types"

export type OpenLocalBrainDbOptions = {
  /**
   * Optional sync targets after IndexedDB write.
   * mysql / postgre / remote-api are declared but not implemented yet —
   * enabling them will reject on sync calls.
   */
  syncDrivers?: readonly SyncDriverKind[]
  /** Inject custom sinks (tests / future bridges). Overrides syncDrivers when set. */
  syncSinks?: readonly SyncSink[]
}

export type LocalBrainDbHandle = {
  readonly kind: "local-brain-db"
  readonly primary: PrimaryStore
  readonly syncSinks: readonly SyncSink[]
}

export async function openLocalBrainDb(
  options: OpenLocalBrainDbOptions = {}
): Promise<LocalBrainDbHandle> {
  const primary = createIndexedDbPrimaryStore()
  const syncSinks =
    options.syncSinks ??
    (options.syncDrivers ?? []).map((kind) => createSyncSink(kind))

  return {
    kind: "local-brain-db",
    primary,
    syncSinks
  }
}
