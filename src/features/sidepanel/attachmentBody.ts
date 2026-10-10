import { pageContentFormat, type PageAttachment } from "~shared/chatMessages"

export function attachmentBody(attachment: PageAttachment): string {
  if (attachment.kind === "record") {
    return attachment.html ?? ""
  }
  if (pageContentFormat(attachment) === "html") {
    return attachment.html ?? ""
  }
  return attachment.markdown ?? ""
}
