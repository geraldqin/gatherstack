import { DriverNotImplementedError } from "../errors"
import type { SyncDriverKind } from "./kinds"
import type { SyncSink } from "./types"

export function createUnimplementedSyncSink(kind: SyncDriverKind): SyncSink {
  const reject = (): Promise<never> =>
    Promise.reject(new DriverNotImplementedError(kind))

  return {
    kind,
    upsert: reject,
    deleteById: reject
  }
}
