/**
 * Post-process Turndown output for side-panel readability / LLM feeding.
 * Does not change meaning; only strips empty chrome and excess blank lines.
 */
export function polishPageMarkdown(markdown: string): string {
  let s = markdown.replace(/\r\n/g, "\n")

  // Trailing spaces on each line
  s = s.replace(/[ \t]+$/gm, "")

  // Empty / whitespace-only image and link markup
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
  s = s.replace(/\[\s*\]\([^)]*\)/g, "")
  // Keep link text when href is empty
  s = s.replace(/\[([^\]]+)]\(\s*\)/g, "$1")

  // Empty headings / list markers left by stripped nodes
  s = s.replace(/^#{1,6}[ \t]*$/gm, "")
  s = s.replace(/^([ \t]*[-*+]|\s*\d+\.)[ \t]*$/gm, "")

  // Collapse 3+ blank lines (after removals may leave fresh gaps)
  s = s.replace(/\n{3,}/g, "\n\n")

  return s.trim()
}
