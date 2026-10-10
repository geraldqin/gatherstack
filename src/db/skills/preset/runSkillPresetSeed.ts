import {
  createLocalBrainDexie,
  type LocalBrainDexie
} from "../../drivers/indexeddb/dexieDb"
import { createSkillsRepository } from "../repository"
import { currentSkillPresetLocaleKey, loadPresetCatalog } from "./catalog"
import { seedPresetSkills } from "./seedPresetSkills"
import { loadSuppressedBuiltinIds } from "./suppressedStorage"

let seedInFlight: Promise<void> | null = null

/**
 * Load bundled catalog and apply seed/upgrade. Safe to call repeatedly.
 */
export async function runSkillPresetSeed(
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
      const repo = createSkillsRepository(dexie)
      const suppressedBuiltinIds = await loadSuppressedBuiltinIds()
      const localeKey = currentSkillPresetLocaleKey()
      const entries = loadPresetCatalog(localeKey)
      console.info("[skill-preset-seed]", {
        localeKey,
        uiLocale: chrome.i18n?.getMessage?.("@@ui_locale"),
        uiLanguage: chrome.i18n?.getUILanguage?.(),
        names: entries.map((e) => {
          const m = e.markdown.match(/^name:\s*(.+)$/m)
          return { builtinId: e.builtinId, name: m?.[1]?.trim() ?? "?" }
        })
      })
      await seedPresetSkills({
        entries,
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
