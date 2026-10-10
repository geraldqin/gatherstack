/** Primary store (always on). */
export const PRIMARY_DRIVER = "indexeddb" as const

/** Optional sync targets written after IndexedDB succeeds. */
export const SYNC_DRIVER_KINDS = ["mysql", "postgre", "remote-api"] as const

export type PrimaryDriverKind = typeof PRIMARY_DRIVER
export type SyncDriverKind = (typeof SYNC_DRIVER_KINDS)[number]
export type StorageDriverKind = PrimaryDriverKind | SyncDriverKind
