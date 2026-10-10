export const PAGE_MARKDOWN_LLM_MAX_CHARS = 32_000

const TRUNCATE_MARKER = "…（内容过长，已截断）"
const TRUNCATE_SUFFIX = `\n\n${TRUNCATE_MARKER}`

export function truncateForLlm(
  text: string,
  maxChars: number = PAGE_MARKDOWN_LLM_MAX_CHARS
): string {
  if (text.includes(TRUNCATE_MARKER)) {
    return text
  }
  if (text.length <= maxChars) {
    return text
  }
  return `${text.slice(0, maxChars)}${TRUNCATE_SUFFIX}`
}
