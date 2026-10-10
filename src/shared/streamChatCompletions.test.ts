import { describe, expect, it, vi } from "vitest"

import {
  completionsUrl,
  deltaFromSseLine,
  extractApiErrorMessage,
  streamChatCompletions
} from "./streamChatCompletions"

const baseParams = {
  baseUrl: "https://api.example.com/v1",
  apiKey: "k",
  model: "m",
  messages: [{ role: "user" as const, content: "hi" }]
}

describe("completionsUrl", () => {
  it("strips trailing slashes and appends chat/completions", () => {
    expect(completionsUrl("https://api.deepseek.com/v1/")).toBe(
      "https://api.deepseek.com/v1/chat/completions"
    )
  })
})

describe("deltaFromSseLine", () => {
  it("extracts delta content", () => {
    expect(
      deltaFromSseLine('data: {"choices":[{"delta":{"content":"Hi"}}]}')
    ).toEqual({ type: "delta", content: "Hi" })
  })

  it("recognizes DONE", () => {
    expect(deltaFromSseLine("data: [DONE]")).toEqual({ type: "done" })
  })

  it("extracts error payloads", () => {
    expect(
      deltaFromSseLine(
        'data: {"error":{"message":"This model\'s maximum context length is 8192 tokens."}}'
      )
    ).toEqual({
      type: "error",
      message: "This model's maximum context length is 8192 tokens."
    })
  })

  it("ignores broken json", () => {
    expect(deltaFromSseLine("data: {not json")).toEqual({ type: "ignore" })
  })
})

describe("extractApiErrorMessage", () => {
  it("reads OpenAI-style error.message", () => {
    expect(
      extractApiErrorMessage(
        JSON.stringify({
          error: {
            message:
              "This model's maximum context length is 8192 tokens. However, your messages resulted in 12000 tokens.",
            type: "invalid_request_error",
            code: "context_length_exceeded"
          }
        })
      )
    ).toBe(
      "This model's maximum context length is 8192 tokens. However, your messages resulted in 12000 tokens."
    )
  })

  it("reads top-level message and plain text", () => {
    expect(extractApiErrorMessage('{"message":"quota exceeded"}')).toBe(
      "quota exceeded"
    )
    expect(extractApiErrorMessage("upstream unavailable")).toBe(
      "upstream unavailable"
    )
  })

  it("returns undefined for empty body", () => {
    expect(extractApiErrorMessage("")).toBeUndefined()
    expect(extractApiErrorMessage("   ")).toBeUndefined()
  })
})

describe("streamChatCompletions", () => {
  it("calls onDelta for each content chunk then done", async () => {
    const deltas: string[] = []
    const body = [
      'data: {"choices":[{"delta":{"content":"Hel"}}]}',
      'data: {"choices":[{"delta":{"content":"lo"}}]}',
      "data: [DONE]",
      ""
    ].join("\n")

    const result = await streamChatCompletions({
      ...baseParams,
      onDelta: (text) => deltas.push(text),
      fetchImpl: async (input, init) => {
        expect(String(input)).toBe("https://api.example.com/v1/chat/completions")
        const headers = new Headers(init?.headers)
        expect(headers.get("Authorization")).toBe("Bearer k")
        expect(headers.get("Content-Type")).toBe("application/json")
        return new Response(body, { status: 200 })
      }
    })

    expect(deltas).toEqual(["Hel", "lo"])
    expect(result).toEqual({ ok: true, reason: "done" })
  })

  it("returns aborted when the signal is already aborted", async () => {
    const controller = new AbortController()
    controller.abort()
    const result = await streamChatCompletions({
      ...baseParams,
      signal: controller.signal,
      onDelta: () => undefined,
      fetchImpl: async (_input, init) => {
        if (init?.signal?.aborted) {
          throw new DOMException("Aborted", "AbortError")
        }
        throw new Error("expected abort")
      }
    })
    expect(result).toEqual({ ok: true, reason: "aborted" })
  })

  it("returns fail on HTTP 401 with status fallback", async () => {
    const result = await streamChatCompletions({
      ...baseParams,
      onDelta: () => undefined,
      fetchImpl: async () => new Response("", { status: 401 })
    })
    expect(result).toEqual({ ok: false, message: "HTTP 401" })
  })

  it("returns API error message from HTTP error body", async () => {
    const result = await streamChatCompletions({
      ...baseParams,
      onDelta: () => undefined,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            error: {
              message: "This model's maximum context length is 8192 tokens."
            }
          }),
          { status: 400 }
        )
    })
    expect(result).toEqual({
      ok: false,
      message: "This model's maximum context length is 8192 tokens."
    })
  })

  it("returns API error from SSE payload when stream reports error", async () => {
    const body = [
      'data: {"error":{"message":"context_length_exceeded"}}',
      ""
    ].join("\n")
    const result = await streamChatCompletions({
      ...baseParams,
      onDelta: () => undefined,
      fetchImpl: async () => new Response(body, { status: 200 })
    })
    expect(result).toEqual({
      ok: false,
      message: "context_length_exceeded"
    })
  })

  it("fails after idle timeout with no chunks", async () => {
    vi.useFakeTimers()
    const never = new ReadableStream<Uint8Array>({
      start() {
        return undefined
      }
    })
    const promise = streamChatCompletions({
      ...baseParams,
      idleTimeoutMs: 60_000,
      onDelta: () => undefined,
      fetchImpl: async () => new Response(never, { status: 200 })
    })
    await vi.advanceTimersByTimeAsync(60_000)
    await expect(promise).resolves.toEqual({ ok: false })
    vi.useRealTimers()
  })
})
