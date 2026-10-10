import type { ApiChatMessage } from "./chatMessages"

export function completionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`
}

const MAX_ERROR_MESSAGE_CHARS = 500

export type SseLineResult =
  | { type: "delta"; content: string }
  | { type: "done" }
  | { type: "error"; message: string }
  | { type: "ignore" }

function truncateErrorMessage(text: string): string {
  if (text.length <= MAX_ERROR_MESSAGE_CHARS) {
    return text
  }
  return `${text.slice(0, MAX_ERROR_MESSAGE_CHARS)}…`
}

function readErrorField(json: unknown): string | undefined {
  if (!json || typeof json !== "object") {
    return undefined
  }
  const err = (json as { error?: unknown }).error
  if (typeof err === "string" && err.trim()) {
    return err.trim()
  }
  if (err && typeof err === "object") {
    const nested = (err as { message?: unknown }).message
    if (typeof nested === "string" && nested.trim()) {
      return nested.trim()
    }
  }
  const message = (json as { message?: unknown }).message
  if (typeof message === "string" && message.trim()) {
    return message.trim()
  }
  return undefined
}

/** Pull a human-readable error from provider JSON or plain-text bodies. */
export function extractApiErrorMessage(body: string): string | undefined {
  const trimmed = body.trim()
  if (!trimmed) {
    return undefined
  }
  try {
    const fromJson = readErrorField(JSON.parse(trimmed) as unknown)
    if (fromJson) {
      return truncateErrorMessage(fromJson)
    }
  } catch {
    // plain text body
  }
  return truncateErrorMessage(trimmed)
}

export function deltaFromSseLine(line: string): SseLineResult {
  const trimmed = line.trim()
  if (!trimmed.startsWith("data:")) {
    return { type: "ignore" }
  }
  const payload = trimmed.slice("data:".length).trim()
  if (payload === "[DONE]") {
    return { type: "done" }
  }
  try {
    const json: unknown = JSON.parse(payload)
    const errorMessage = readErrorField(json)
    if (errorMessage) {
      return { type: "error", message: truncateErrorMessage(errorMessage) }
    }
    const content = readDeltaContent(json)
    if (typeof content === "string" && content.length > 0) {
      return { type: "delta", content }
    }
    return { type: "ignore" }
  } catch {
    return { type: "ignore" }
  }
}

function readDeltaContent(json: unknown): unknown {
  if (!json || typeof json !== "object") {
    return undefined
  }
  const choices = (json as { choices?: unknown }).choices
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== "object") {
    return undefined
  }
  const delta = (choices[0] as { delta?: unknown }).delta
  if (!delta || typeof delta !== "object") {
    return undefined
  }
  return (delta as { content?: unknown }).content
}

export type StreamChatResult =
  | { ok: true; reason: "done" | "aborted" }
  | { ok: false; message?: string }

export type StreamChatParams = {
  baseUrl: string
  apiKey: string
  model: string
  messages: ApiChatMessage[]
  onDelta: (text: string) => void
  signal?: AbortSignal
  idleTimeoutMs?: number
  fetchImpl?: typeof fetch
}

const DEFAULT_IDLE_MS = 60_000

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError"
}

async function messageFromFailedResponse(
  response: Response
): Promise<string> {
  try {
    const body = await response.text()
    const extracted = extractApiErrorMessage(body)
    if (extracted) {
      return extracted
    }
  } catch {
    // ignore body read failures
  }
  return `HTTP ${response.status}`
}

export async function streamChatCompletions(
  params: StreamChatParams
): Promise<StreamChatResult> {
  const fetchImpl = params.fetchImpl ?? fetch
  const idleTimeoutMs = params.idleTimeoutMs ?? DEFAULT_IDLE_MS
  const fetchAbort = new AbortController()
  const combined = params.signal
    ? AbortSignal.any([params.signal, fetchAbort.signal])
    : fetchAbort.signal

  let timedOut = false
  let idleTimer: ReturnType<typeof setTimeout> | undefined
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined

  function armIdle() {
    if (idleTimer !== undefined) {
      clearTimeout(idleTimer)
    }
    idleTimer = setTimeout(() => {
      timedOut = true
      fetchAbort.abort()
      void reader?.cancel()
    }, idleTimeoutMs)
  }

  function clearIdle() {
    if (idleTimer !== undefined) {
      clearTimeout(idleTimer)
    }
  }

  try {
    armIdle()
    const response = await fetchImpl(completionsUrl(params.baseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        stream: true
      }),
      signal: combined
    })
    if (params.signal?.aborted) {
      return { ok: true, reason: "aborted" }
    }
    if (timedOut) {
      return { ok: false }
    }
    if (!response.ok) {
      return { ok: false, message: await messageFromFailedResponse(response) }
    }
    if (!response.body) {
      return { ok: false, message: `HTTP ${response.status}` }
    }

    reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    const onUserAbort = () => {
      void reader?.cancel()
    }
    params.signal?.addEventListener("abort", onUserAbort)
    try {
      armIdle()
      while (true) {
        const { done, value } = await reader.read()
        if (timedOut) {
          return { ok: false }
        }
        if (params.signal?.aborted) {
          return { ok: true, reason: "aborted" }
        }
        if (done) {
          break
        }
        armIdle()
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split(/\r?\n/)
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          const parsed = deltaFromSseLine(line)
          if (parsed.type === "done") {
            return { ok: true, reason: "done" }
          }
          if (parsed.type === "error") {
            return { ok: false, message: parsed.message }
          }
          if (parsed.type === "delta") {
            params.onDelta(parsed.content)
          }
        }
      }
      if (buffer.trim()) {
        const parsed = deltaFromSseLine(buffer)
        if (parsed.type === "error") {
          return { ok: false, message: parsed.message }
        }
        if (parsed.type === "delta") {
          params.onDelta(parsed.content)
        }
      }
      return { ok: true, reason: "done" }
    } finally {
      params.signal?.removeEventListener("abort", onUserAbort)
    }
  } catch (error) {
    if (params.signal?.aborted) {
      return { ok: true, reason: "aborted" }
    }
    if (timedOut || isAbortError(error)) {
      return { ok: false }
    }
    const message =
      error instanceof Error && error.message.trim()
        ? truncateErrorMessage(error.message.trim())
        : undefined
    return { ok: false, ...(message ? { message } : {}) }
  } finally {
    clearIdle()
  }
}
