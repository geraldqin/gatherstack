import type { ApiChatMessage } from "./chatMessages"
import { t } from "./i18n"
import type { StreamChatResult } from "./streamChatCompletions"

export type GeminiNanoAvailability =
  | "unavailable"
  | "downloadable"
  | "downloading"
  | "available"

export type GeminiNanoDownloadProgressEvent = {
  loaded?: number
  total?: number
}

export type GeminiNanoMonitor = {
  addEventListener: (
    type: "downloadprogress",
    listener: (event: GeminiNanoDownloadProgressEvent) => void
  ) => void
}

export type GeminiNanoSession = {
  promptStreaming: (
    input: string,
    options?: { signal?: AbortSignal }
  ) => AsyncIterable<string> | ReadableStream<string>
  destroy: () => void
}

export type GeminiNanoCapabilityOptions = {
  expectedInputs?: Array<{ type: string; languages?: string[] }>
  expectedOutputs?: Array<{ type: string; languages?: string[] }>
}

export type GeminiNanoCreateOptions = GeminiNanoCapabilityOptions & {
  initialPrompts?: ApiChatMessage[]
  signal?: AbortSignal
  monitor?: (monitor: GeminiNanoMonitor) => void
}

/** Keep availability() and create() aligned (Chrome Prompt API requirement). */
export const GEMINI_NANO_CAPABILITY_OPTIONS: GeminiNanoCapabilityOptions = {
  expectedInputs: [{ type: "text", languages: ["en"] }],
  expectedOutputs: [{ type: "text", languages: ["en"] }]
}

export type GeminiNanoApi = {
  availability: (options?: GeminiNanoCapabilityOptions) => Promise<string>
  create: (options?: GeminiNanoCreateOptions) => Promise<GeminiNanoSession>
}

/**
 * Chrome Prompt API uses `loaded` in [0, 1]. Some builds/docs also expose
 * byte `loaded`/`total`. Returns a 0–1 fraction, or null if unusable.
 */
export function normalizeDownloadProgressFraction(
  event: GeminiNanoDownloadProgressEvent
): number | null {
  const loaded = event.loaded
  if (typeof loaded !== "number" || Number.isNaN(loaded)) {
    return null
  }
  const total = event.total
  if (typeof total === "number" && total > 0 && loaded > 1) {
    return Math.min(1, Math.max(0, loaded / total))
  }
  if (loaded >= 0 && loaded <= 1) {
    return loaded
  }
  return null
}

export type StreamGeminiNanoResult =
  | StreamChatResult
  | { ok: false; error: "unsupported" | "need-download" }

const KNOWN_STATUS: GeminiNanoAvailability[] = [
  "unavailable",
  "downloadable",
  "downloading",
  "available"
]

function isAvailability(value: string): value is GeminiNanoAvailability {
  return KNOWN_STATUS.includes(value as GeminiNanoAvailability)
}

export function getLanguageModelApi(): GeminiNanoApi | null {
  const candidate = (globalThis as { LanguageModel?: GeminiNanoApi }).LanguageModel
  if (!candidate || typeof candidate.availability !== "function") {
    return null
  }
  return candidate
}

export async function probeGeminiNanoAvailability(
  api: GeminiNanoApi | null = getLanguageModelApi()
): Promise<GeminiNanoAvailability> {
  if (!api) {
    return "unavailable"
  }
  try {
    const status = await api.availability(GEMINI_NANO_CAPABILITY_OPTIONS)
    return isAvailability(status) ? status : "unavailable"
  } catch {
    return "unavailable"
  }
}

export async function downloadGeminiNano(params?: {
  onProgress?: (loaded: number) => void
  signal?: AbortSignal
  api?: GeminiNanoApi | null
}): Promise<
  | { ok: true; reason?: "aborted" }
  | { ok: false; message: string }
> {
  const onProgress = params?.onProgress
  const signal = params?.signal
  const api =
    params?.api === undefined ? getLanguageModelApi() : params.api
  if (!api) {
    return { ok: false, message: t("modelNanoChromeUnsupported") }
  }
  if (signal?.aborted) {
    return { ok: true, reason: "aborted" }
  }
  let session: GeminiNanoSession | undefined
  try {
    session = await api.create({
      ...GEMINI_NANO_CAPABILITY_OPTIONS,
      signal,
      monitor(monitor) {
        // Show 0% as soon as Chrome hands us the monitor (before first event).
        onProgress?.(0)
        monitor.addEventListener("downloadprogress", (event) => {
          const fraction = normalizeDownloadProgressFraction(event)
          if (fraction != null) {
            onProgress?.(fraction)
            return
          }
          // Some builds expose ProgressEvent fields only on the prototype.
          const proto = event as GeminiNanoDownloadProgressEvent & {
            loaded?: number
            total?: number
          }
          const fallback = normalizeDownloadProgressFraction({
            loaded: proto.loaded,
            total: proto.total
          })
          if (fallback != null) {
            onProgress?.(fallback)
          }
        })
      }
    })
    if (signal?.aborted) {
      return { ok: true, reason: "aborted" }
    }
    return { ok: true }
  } catch (error) {
    if (
      signal?.aborted ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      return { ok: true, reason: "aborted" }
    }
    return { ok: false, message: t("modelNanoDownloadFailed") }
  } finally {
    session?.destroy()
  }
}

function splitPrompt(messages: ApiChatMessage[]): {
  initialPrompts: ApiChatMessage[] | undefined
  prompt: string
} {
  const last = messages[messages.length - 1]
  const prior = messages.slice(0, -1)
  return {
    initialPrompts: prior.length > 0 ? prior : undefined,
    prompt: last?.content ?? ""
  }
}

/** If the runtime rejects `system`, fold skill text into the last user turn. */
export function foldSystemIntoUser(messages: ApiChatMessage[]): ApiChatMessage[] {
  const systems = messages.filter((item) => item.role === "system")
  if (systems.length === 0) {
    return messages
  }
  const rest = messages.filter((item) => item.role !== "system")
  const prefix = systems.map((item) => item.content).join("\n\n")
  if (rest.length === 0) {
    return [{ role: "user", content: prefix }]
  }
  const last = rest[rest.length - 1]!
  if (last.role === "user") {
    return [
      ...rest.slice(0, -1),
      { role: "user", content: `${prefix}\n\n${last.content}` }
    ]
  }
  return [{ role: "user", content: prefix }, ...rest]
}

async function* iterateChunks(
  stream: AsyncIterable<string> | ReadableStream<string>
): AsyncGenerator<string> {
  if (Symbol.asyncIterator in Object(stream)) {
    for await (const chunk of stream as AsyncIterable<string>) {
      yield chunk
    }
    return
  }
  const reader = (stream as ReadableStream<string>).getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        return
      }
      if (value) {
        yield value
      }
    }
  } finally {
    reader.releaseLock()
  }
}

function toDelta(previous: string, chunk: string): { previous: string; delta: string } {
  if (chunk.startsWith(previous)) {
    return { previous: chunk, delta: chunk.slice(previous.length) }
  }
  return { previous: previous + chunk, delta: chunk }
}

export async function streamGeminiNano(params: {
  messages: ApiChatMessage[]
  onDelta: (text: string) => void
  signal?: AbortSignal
  api?: GeminiNanoApi | null
}): Promise<StreamGeminiNanoResult> {
  if (params.signal?.aborted) {
    return { ok: true, reason: "aborted" }
  }
  const api = params.api === undefined ? getLanguageModelApi() : params.api
  const availability = await probeGeminiNanoAvailability(api)
  if (availability === "unavailable") {
    return { ok: false, error: "unsupported" }
  }
  if (availability === "downloadable" || availability === "downloading") {
    return { ok: false, error: "need-download" }
  }
  if (!api) {
    return { ok: false, error: "unsupported" }
  }

  const { initialPrompts, prompt } = splitPrompt(params.messages)
  if (!prompt) {
    return { ok: false }
  }

  let session: GeminiNanoSession | undefined
  let emitted = false
  try {
    let streamPrompt = prompt
    try {
      session = await api.create({
        ...GEMINI_NANO_CAPABILITY_OPTIONS,
        initialPrompts,
        signal: params.signal
      })
    } catch {
      const folded = foldSystemIntoUser(params.messages)
      const retry = splitPrompt(folded)
      if (!retry.prompt) {
        return { ok: false }
      }
      session = await api.create({
        ...GEMINI_NANO_CAPABILITY_OPTIONS,
        initialPrompts: retry.initialPrompts,
        signal: params.signal
      })
      streamPrompt = retry.prompt
    }
    if (params.signal?.aborted) {
      return { ok: true, reason: "aborted" }
    }
    let previous = ""
    for await (const chunk of iterateChunks(
      session.promptStreaming(streamPrompt, { signal: params.signal })
    )) {
      if (params.signal?.aborted) {
        return { ok: true, reason: "aborted" }
      }
      const next = toDelta(previous, chunk)
      previous = next.previous
      if (next.delta) {
        emitted = true
        params.onDelta(next.delta)
      }
    }
    return { ok: true, reason: "done" }
  } catch (error) {
    if (params.signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
      return { ok: true, reason: "aborted" }
    }
    // Chrome may error the stream after the last chunk (e.g. QuotaExceeded
    // when committing the reply into session context). Keep the output.
    if (emitted) {
      return { ok: true, reason: "done" }
    }
    const message =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : undefined
    return { ok: false, ...(message ? { message } : {}) }
  } finally {
    try {
      session?.destroy()
    } catch {
      // ignore destroy failures after the stream has settled
    }
  }
}
