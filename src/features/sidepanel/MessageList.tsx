import { useEffect, useRef, useState } from "react"

import type { ChatMessage } from "~shared/chatMessages"
import { t } from "~shared/i18n"

import { canSaveMessage } from "./canSaveMessage"
import { canCopyMessage, copyableMessageText } from "./copyableMessageText"
import {
  previewBubbleContent,
  shouldCollapseBubble
} from "./messageBubbleCollapse"
import { PageAttachmentChip } from "./PageAttachmentChip"
import { SkillChip } from "./SkillChip"

export { canSaveMessage } from "./canSaveMessage"

type MessageListProps = {
  messages: ChatMessage[]
  onSaveMessage: (message: ChatMessage) => Promise<void>
  onStopMessage?: (message: ChatMessage) => void
}

type ActionFeedback = {
  messageId: string
  kind: "ok" | "error"
  text: string
}

export function MessageList({
  messages,
  onSaveMessage,
  onStopMessage
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())

  function toggleExpanded(messageId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(messageId)) next.delete(messageId)
      else next.add(messageId)
      return next
    })
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages])

  useEffect(() => {
    if (!feedback || feedback.kind !== "ok") {
      return
    }
    const timer = window.setTimeout(() => {
      setFeedback((prev) =>
        prev?.messageId === feedback.messageId ? null : prev
      )
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [feedback])

  async function handleSave(message: ChatMessage) {
    if (savingId) {
      return
    }
    setSavingId(message.id)
    setFeedback(null)
    try {
      await onSaveMessage(message)
      setFeedback({
        messageId: message.id,
        kind: "ok",
        text: t("sidepanelMessageSaved")
      })
    } catch (error) {
      setFeedback({
        messageId: message.id,
        kind: "error",
        text:
          error instanceof Error && error.message
            ? error.message
            : t("commonSaveFailed")
      })
    } finally {
      setSavingId(null)
    }
  }

  async function handleCopy(message: ChatMessage) {
    const text = copyableMessageText(message)
    if (!text) {
      return
    }
    setFeedback(null)
    try {
      await navigator.clipboard.writeText(text)
      setFeedback({
        messageId: message.id,
        kind: "ok",
        text: t("commonCopied")
      })
    } catch {
      setFeedback({
        messageId: message.id,
        kind: "error",
        text: t("commonCopyFailed")
      })
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
      {messages.length === 0 ? (
        <p className="text-left text-sm text-slate-400">
          {t("sidepanelEmptyMessages")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {messages.map((item) => {
            const isUser = item.role === "user"
            const showPlaceholder =
              item.role === "assistant" &&
              item.status === "streaming" &&
              !item.content
            const body = item.content
            const canCollapse = shouldCollapseBubble({
              role: item.role,
              content: body ?? "",
              status: item.status
            })
            const collapsed = canCollapse && !expandedIds.has(item.id)
            const displayBody =
              collapsed && body ? previewBubbleContent(body) : body
            const showCopy = canCopyMessage(item)
            const showSave = canSaveMessage(item)
            const showStop =
              item.role === "assistant" &&
              item.status === "streaming" &&
              onStopMessage != null
            const itemFeedback =
              feedback?.messageId === item.id ? feedback : null
            return (
              <li
                key={item.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`flex max-w-[85%] flex-col gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-800 ${
                    isUser
                      ? "bg-slate-100"
                      : "border border-slate-200 bg-white"
                  }`}>
                  {item.attachment ? (
                    <PageAttachmentChip attachment={item.attachment} />
                  ) : null}
                  {item.skillName ? (
                    <SkillChip
                      name={item.skillName}
                      skillId={item.skillId}
                    />
                  ) : null}
                  {showPlaceholder ? (
                    <p className="animate-pulse text-sm text-slate-400">
                      thinking
                    </p>
                  ) : body ? (
                    <div className="whitespace-pre-wrap break-words">
                      {displayBody}
                    </div>
                  ) : null}
                  {canCollapse ? (
                    <button
                      type="button"
                      className="self-start text-xs text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
                      onClick={() => toggleExpanded(item.id)}>
                      {collapsed
                        ? t("sidepanelMessageExpand")
                        : t("sidepanelMessageCollapse")}
                    </button>
                  ) : null}
                  {item.errorMessage ? (
                    <p
                      className={`break-words text-xs text-slate-400${
                        item.content ? " mt-1" : ""
                      }`}>
                      {item.errorMessage}
                    </p>
                  ) : null}
                  {showCopy || showSave || showStop || item.savedRecordId ? (
                    <div className="flex items-center gap-1 pt-0.5">
                      {showStop ? (
                        <button
                          type="button"
                          aria-label={t("sidepanelMessageStop")}
                          title={t("sidepanelMessageStop")}
                          className="rounded px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                          onClick={() => onStopMessage?.(item)}>
                          {t("sidepanelMessageStop")}
                        </button>
                      ) : null}
                      {showCopy ? (
                        <button
                          type="button"
                          aria-label={t("sidepanelCopyAria")}
                          title={t("commonCopy")}
                          className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-200/60 hover:text-slate-800"
                          onClick={() => {
                            void handleCopy(item)
                          }}>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-3.5 w-3.5"
                            aria-hidden="true">
                            <rect
                              x="9"
                              y="9"
                              width="13"
                              height="13"
                              rx="2"
                              ry="2"
                            />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                      ) : null}
                      {showSave ? (
                        <button
                          type="button"
                          disabled={savingId === item.id}
                          aria-label={
                            savingId === item.id
                              ? t("commonSavingShort")
                              : t("sidepanelStoreMessage")
                          }
                          title={
                            savingId === item.id
                              ? t("commonSaving")
                              : t("sidepanelStoreMessage")
                          }
                          className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => {
                            void handleSave(item)
                          }}>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`h-3.5 w-3.5 ${
                              savingId === item.id ? "animate-pulse" : ""
                            }`}
                            aria-hidden="true">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                            <polyline points="17 21 17 13 7 13 7 21" />
                            <polyline points="7 3 7 8 15 8" />
                          </svg>
                        </button>
                      ) : null}
                      {item.savedRecordId ? (
                        <span className="text-xs text-slate-400">
                          {t("sidepanelMessageStored")}
                        </span>
                      ) : null}
                      {itemFeedback ? (
                        <span
                          className={`text-xs ${
                            itemFeedback.kind === "ok"
                              ? "text-slate-500"
                              : "text-red-500"
                          }`}>
                          {itemFeedback.text}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
