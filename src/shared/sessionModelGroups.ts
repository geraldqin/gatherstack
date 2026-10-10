import type { SessionModelOption } from "./modelConfig"

export type SessionModelGroup = {
  providerId: string
  providerLabel: string
  options: SessionModelOption[]
}

/** Group consecutive options by providerId (listAllSessionModelOptions order). */
export function groupSessionModelsByProvider(
  options: SessionModelOption[]
): SessionModelGroup[] {
  const groups: SessionModelGroup[] = []
  for (const option of options) {
    const last = groups[groups.length - 1]
    if (last && last.providerId === option.providerId) {
      last.options.push(option)
    } else {
      groups.push({
        providerId: option.providerId,
        providerLabel: option.providerLabel,
        options: [option]
      })
    }
  }
  return groups
}

/** Provider id to expand when opening the picker. */
export function defaultExpandedProviderId(
  groups: SessionModelGroup[],
  selected: SessionModelOption | undefined
): string | null {
  if (selected) {
    return selected.providerId
  }
  return groups[0]?.providerId ?? null
}
