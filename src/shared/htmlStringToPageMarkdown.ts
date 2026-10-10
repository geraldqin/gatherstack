import { documentToMarkdown } from "~shared/pageDomToMarkdown"
import { truncateForLlm } from "~shared/truncateForLlm"

export function htmlStringToPageMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html")
  const { title, markdown } = documentToMarkdown(doc)
  let result = markdown.trim()
  const trimmedTitle = title.trim()
  if (trimmedTitle) {
    result = `标题：${trimmedTitle}\n\n${result}`
  }
  return truncateForLlm(result)
}
