export type SlashSkillMatch = {
  /** Inclusive start index of the `/` trigger in the text. */
  start: number
  /** Exclusive end index of the trigger token (through current query). */
  end: number
  query: string
}

/**
 * Detect an active `/` skill trigger: `/` at start or after whitespace,
 * with no whitespace after `/` until cursor (simplified: end of string).
 */
export function detectSlashSkillTrigger(text: string): SlashSkillMatch | null {
  const match = text.match(/(^|\s)\/([^\s/]*)$/)
  if (!match) {
    return null
  }
  const full = match[0] ?? ""
  const query = match[2] ?? ""
  const start = text.length - full.length + (match[1]?.length ?? 0)
  return {
    start,
    end: text.length,
    query
  }
}

export function filterSkillsByQuery<T extends { name: string }>(
  skills: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase()
  if (!q) {
    return skills
  }
  return skills.filter((skill) => skill.name.toLowerCase().includes(q))
}

export function applySkillSelection(
  text: string,
  trigger: SlashSkillMatch
): string {
  const before = text.slice(0, trigger.start).replace(/\s+$/, "")
  return before
}
