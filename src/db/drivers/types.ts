import type { CollectedRecord } from "../records/types"
import type { PrimaryDriverKind, SyncDriverKind } from "./kinds"

/** Authority store: all reads go here. */
export type PrimaryStore = {
  readonly kind: PrimaryDriverKind
  insert(record: CollectedRecord): Promise<void>
  update(record: CollectedRecord): Promise<void>
  getById(id: string): Promise<CollectedRecord | undefined>
  list(): Promise<CollectedRecord[]>
  deleteById(id: string): Promise<void>
  close(): Promise<void>
}

/**
 * Optional secondary target. Plugin may push after local write.
 * Real TCP SQL usually needs a bridge; these drivers stay unimplemented for now.
 */
export type SyncSink = {
  readonly kind: SyncDriverKind
  upsert(record: CollectedRecord): Promise<void>
  deleteById(id: string): Promise<void>
}
