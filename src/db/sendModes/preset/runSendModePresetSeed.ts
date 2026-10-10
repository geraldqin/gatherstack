import {
  createLocalBrainDexie,
  type LocalBrainDexie
} from "../../drivers/indexeddb/dexieDb"
import { createSendModesRepository } from "../repository"
import { loadSendModePresetCatalog } from "./catalog"
import { seedPresetSendModes } from "./seedPresetSendModes"
import { loadSuppressedSendModeBuiltinIds } from "./suppressedStorage"

let seedInFlight: Promise<void> | null = null

/**
 * Load bundled catalog and apply seed/upgrade. Safe to call repeatedly.
 */
export async function runSendModePresetSeed(
  db?: LocalBrainDexie
): Promise<void> {
  if (seedInFlight) {
    await seedInFlight
    return
  }

  seedInFlight = (async () => {
    const owned = !db
    const dexie = db ?? createLocalBrainDexie()
    try {
      if (!dexie.isOpen()) {
        await dexie.open()
      }
      const repo = createSendModesRepository(dexie)
      const suppressedBuiltinIds = await loadSuppressedSendModeBuiltinIds()
      await seedPresetSendModes({
        entries: loadSendModePresetCatalog(),
        suppressedBuiltinIds,
        repo
      })
    } finally {
      if (owned) {
        dexie.close()
      }
    }
  })()

  try {
    await seedInFlight
  } finally {
    seedInFlight = null
  }
}
