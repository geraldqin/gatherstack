import { t } from "~shared/i18n"

import type { AsyncParseJob } from "./types"

export function asyncParseJobPreview(job: Pick<
  AsyncParseJob,
  "text" | "attachment" | "skill"
>): string {
  const skillName = job.skill?.name?.trim()
  const textLine = job.text.trim().split(/\r?\n/)[0]?.trim() ?? ""
  const parts: string[] = []
  if (skillName) {
    parts.push(skillName)
  }
  if (textLine) {
    parts.push(textLine.length > 40 ? `${textLine.slice(0, 40)}…` : textLine)
  } else if (job.attachment) {
    parts.push(t("asyncParseJobPreviewPage"))
  }
  if (parts.length === 0) {
    return t("asyncParseJobPreviewEmpty")
  }
  return parts.join(" · ")
}
