export const BUBBLE_COLLAPSE_MAX_LINES = 10
export const BUBBLE_COLLAPSE_MAX_CHARS = 400

type CollapseInput = {
  role: "user" | "assistant" | string
  content: string
  status?: string
}

export function shouldCollapseBubble(input: CollapseInput): boolean {
  if (input.role !== "assistant") return false
  if (input.status === "streaming") return false
  const content = input.content ?? ""
  if (!content) return false
  if (content.length > BUBBLE_COLLAPSE_MAX_CHARS) return true
  const lineCount = content.split("\n").length
  return lineCount > BUBBLE_COLLAPSE_MAX_LINES
}

export function previewBubbleContent(content: string): string {
  if (!content) return content
  const lines = content.split("\n")
  let preview =
    lines.length > BUBBLE_COLLAPSE_MAX_LINES
      ? lines.slice(0, BUBBLE_COLLAPSE_MAX_LINES).join("\n")
      : content
  if (preview.length > BUBBLE_COLLAPSE_MAX_CHARS) {
    preview = preview.slice(0, BUBBLE_COLLAPSE_MAX_CHARS)
  }
  if (preview === content) return content
  return `${preview}…`
}
