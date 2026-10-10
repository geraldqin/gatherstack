export function isOneClickCollectUx(flags: {
  callModel: boolean
  autoSave: boolean
}): boolean {
  return flags.callModel && flags.autoSave
}
