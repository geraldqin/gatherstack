import { runSendModePresetSeed, runSkillPresetSeed } from "~db"

export {}

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error))

chrome.runtime.onInstalled.addListener(() => {
  void runSkillPresetSeed().catch((error) =>
    console.error("skill preset seed failed", error)
  )
  void runSendModePresetSeed().catch((error) =>
    console.error("send mode preset seed failed", error)
  )
})
