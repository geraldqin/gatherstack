import { useEffect, useState } from "react"

import {
  attachmentChipLabel,
  type PageAttachment
} from "~shared/chatMessages"
import { t } from "~shared/i18n"

import { attachmentBody } from "./attachmentBody"
import {
  applyEditedBody,
  applySimplify,
  applyStrip,
  isPageAttachmentEditable,
  pageAttachmentToolbar
} from "./pageAttachmentActions"

type PageAttachmentChipProps = {
  attachment: PageAttachment
  onRemove?: () => void
  onAttachmentChange?: (next: PageAttachment) => void
  /** 切到原始 HTML 时由父组件注入；返回 errorMessage 或 null */
  onLoadOriginal?: () => Promise<string | null>
  isLoadOriginalPending?: boolean
  loadOriginalError?: string | null
}

export function PageAttachmentChip({
  attachment,
  onRemove,
  onAttachmentChange,
  onLoadOriginal,
  isLoadOriginalPending = false,
  loadOriginalError = null
}: PageAttachmentChipProps) {
  const [open, setOpen] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const label = attachmentChipLabel(attachment)
  const body = attachmentBody(attachment)
  const hasBody = body.length > 0
  const copiedLabel = t("commonCopied")
  const editable = isPageAttachmentEditable(attachment, onAttachmentChange)
  const toolbar = pageAttachmentToolbar(attachment, editable)
  const showBodyEditor = editable || hasBody

  useEffect(() => {
    if (!open) {
      return
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!copyFeedback) {
      return
    }
    const timer = window.setTimeout(() => setCopyFeedback(null), 2000)
    return () => window.clearTimeout(timer)
  }, [copyFeedback])

  async function handleCopyBody() {
    try {
      await navigator.clipboard.writeText(body)
      setCopyFeedback(copiedLabel)
    } catch {
      setCopyFeedback(t("commonCopyFailed"))
    }
  }

  return (
    <>
      <div className="flex max-w-[10rem] min-w-0 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
        <button
          type="button"
          className="min-w-0 flex-1 truncate text-left text-xs text-slate-700 hover:text-slate-900"
          title={attachment.title?.trim() || attachment.url}
          onClick={() => setOpen(true)}>
          {label}
        </button>
        {onRemove ? (
          <button
            type="button"
            aria-label={t("attachmentRemoveAria")}
            className="shrink-0 rounded px-1 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            onClick={(event) => {
              event.stopPropagation()
              onRemove()
            }}>
            ×
          </button>
        ) : null}
      </div>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"
          onClick={() => setOpen(false)}>
          <div
            className="flex max-h-[85%] w-full max-w-lg flex-col rounded-lg bg-white shadow-lg"
            onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-3 py-2">
              <div className="min-w-0 text-left">
                <p className="break-all text-xs text-slate-700">
                  {attachment.title?.trim() || attachment.url}
                </p>
                {attachment.title?.trim() ? (
                  <p className="mt-0.5 break-all text-xs text-slate-400">
                    {attachment.url}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {hasBody && copyFeedback ? (
                  <span
                    className={`text-xs ${
                      copyFeedback === copiedLabel
                        ? "text-slate-500"
                        : "text-red-500"
                    }`}>
                    {copyFeedback}
                  </span>
                ) : null}
                {hasBody ? (
                  <button
                    type="button"
                    aria-label={t("attachmentCopyPageContent")}
                    title={t("attachmentCopyPageContent")}
                    className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    onClick={() => {
                      void handleCopyBody()
                    }}>
                    {t("commonCopy")}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
                  onClick={() => setOpen(false)}>
                  {t("commonClose")}
                </button>
              </div>
            </div>
            {editable && onLoadOriginal && loadOriginalError ? (
              <p className="px-3 pt-1.5 text-left text-xs text-red-500">
                {loadOriginalError}
              </p>
            ) : null}
            {toolbar.length > 0 ? (
              <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-100 px-3 py-1.5">
                {toolbar.includes("loadOriginal") ? (
                  <button
                    type="button"
                    disabled={isLoadOriginalPending || !onLoadOriginal}
                    className="rounded px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400"
                    onClick={() => {
                      void onLoadOriginal?.()
                    }}>
                    {t("attachmentLoadOriginal")}
                  </button>
                ) : null}
                {toolbar.includes("simplifyMarkdown") ? (
                  <button
                    type="button"
                    className="rounded px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    onClick={() => {
                      onAttachmentChange?.(applySimplify(attachment, body))
                    }}>
                    {t("attachmentSimplifyMarkdown")}
                  </button>
                ) : null}
                {toolbar.includes("stripNoise") ? (
                  <button
                    type="button"
                    className="rounded px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    onClick={() => {
                      onAttachmentChange?.(applyStrip(attachment, body))
                    }}>
                    {t("attachmentStripNoise")}
                  </button>
                ) : null}
              </div>
            ) : null}
            {showBodyEditor ? (
              <textarea
                readOnly={!editable}
                className="min-h-[8rem] flex-1 resize-y overflow-auto whitespace-pre-wrap break-all border-0 bg-transparent px-3 py-2 text-left text-xs text-slate-800 outline-none"
                value={body}
                onChange={(event) => {
                  if (!editable || !onAttachmentChange) {
                    return
                  }
                  onAttachmentChange(applyEditedBody(attachment, event.target.value))
                }}
              />
            ) : (
              <div className="min-h-0 flex-1 overflow-auto px-3 py-2 text-left text-xs text-slate-600">
                <p className="break-all">{attachment.url}</p>
                <p className="mt-2 text-slate-500">
                  {attachment.kind === "record"
                    ? t("attachmentBodyNotSavedRecord")
                    : t("attachmentBodyNotSavedPage")}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
