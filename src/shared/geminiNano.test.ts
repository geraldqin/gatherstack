import { describe, expect, it } from "vitest"

import {
  downloadGeminiNano,
  normalizeDownloadProgressFraction,
  probeGeminiNanoAvailability,
  streamGeminiNano,
  type GeminiNanoApi
} from "./geminiNano"

function asyncChunks(chunks: string[]): AsyncIterable<string> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        yield chunk
      }
    }
  }
}

describe("probeGeminiNanoAvailability", () => {
  it("returns unavailable when the API is missing", async () => {
    await expect(probeGeminiNanoAvailability(null)).resolves.toBe("unavailable")
  })

  it("maps known availability strings", async () => {
    const api: GeminiNanoApi = {
      availability: async () => "downloadable",
      create: async () => {
        throw new Error("unused")
      }
    }
    await expect(probeGeminiNanoAvailability(api)).resolves.toBe("downloadable")
  })

  it("treats unknown status as unavailable", async () => {
    const api: GeminiNanoApi = {
      availability: async () => "nope",
      create: async () => {
        throw new Error("unused")
      }
    }
    await expect(probeGeminiNanoAvailability(api)).resolves.toBe("unavailable")
  })
})

describe("normalizeDownloadProgressFraction", () => {
  it("reads Chrome 0–1 loaded", () => {
    expect(normalizeDownloadProgressFraction({ loaded: 0.4 })).toBe(0.4)
  })

  it("reads byte loaded/total", () => {
    expect(
      normalizeDownloadProgressFraction({ loaded: 40, total: 100 })
    ).toBe(0.4)
  })

  it("returns null when unusable", () => {
    expect(normalizeDownloadProgressFraction({})).toBeNull()
    expect(normalizeDownloadProgressFraction({ loaded: 50 })).toBeNull()
  })
})

describe("downloadGeminiNano", () => {
  it("fails when the API is missing", async () => {
    await expect(downloadGeminiNano({ api: null })).resolves.toEqual({
      ok: false,
      message: "当前 Chrome 不支持端侧模型"
    })
  })

  it("creates a session, reports progress, then destroys it", async () => {
    const progress: number[] = []
    let destroyed = false
    const api: GeminiNanoApi = {
      availability: async () => "downloadable",
      create: async (options) => {
        options?.monitor?.({
          addEventListener(_type, listener) {
            listener({ loaded: 0.4 })
          }
        })
        return {
          promptStreaming: () => asyncChunks([]),
          destroy() {
            destroyed = true
          }
        }
      }
    }
    await expect(
      downloadGeminiNano({
        onProgress: (loaded) => progress.push(loaded),
        api
      })
    ).resolves.toEqual({
      ok: true
    })
    expect(progress).toEqual([0, 0.4])
    expect(destroyed).toBe(true)
  })

  it("returns aborted when the signal is already aborted", async () => {
    const api: GeminiNanoApi = {
      availability: async () => "downloadable",
      create: async () => {
        throw new Error("should not create")
      }
    }
    const controller = new AbortController()
    controller.abort()
    await expect(
      downloadGeminiNano({ api, signal: controller.signal })
    ).resolves.toEqual({ ok: true, reason: "aborted" })
  })

  it("returns aborted when create throws AbortError", async () => {
    const api: GeminiNanoApi = {
      availability: async () => "downloadable",
      create: async () => {
        const error = new Error("aborted")
        error.name = "AbortError"
        throw error
      }
    }
    const controller = new AbortController()
    await expect(
      downloadGeminiNano({ api, signal: controller.signal })
    ).resolves.toEqual({ ok: true, reason: "aborted" })
  })
})

describe("streamGeminiNano", () => {
  it("fails when unavailable", async () => {
    const api: GeminiNanoApi = {
      availability: async () => "unavailable",
      create: async () => {
        throw new Error("unused")
      }
    }
    const result = await streamGeminiNano({
      messages: [{ role: "user", content: "hi" }],
      onDelta: () => undefined,
      api
    })
    expect(result).toEqual({
      ok: false,
      error: "unsupported"
    })
  })

  it("asks the user to download when the model is still downloading", async () => {
    const api: GeminiNanoApi = {
      availability: async () => "downloading",
      create: async () => {
        throw new Error("unused")
      }
    }
    const result = await streamGeminiNano({
      messages: [{ role: "user", content: "hi" }],
      onDelta: () => undefined,
      api
    })
    expect(result).toEqual({
      ok: false,
      error: "need-download"
    })
  })

  it("streams incremental chunks and passes prior turns as initialPrompts", async () => {
    const deltas: string[] = []
    let initialPrompts: unknown
    let promptInput: unknown
    const api: GeminiNanoApi = {
      availability: async () => "available",
      create: async (options) => {
        initialPrompts = options?.initialPrompts
        return {
          promptStreaming: (input) => {
            promptInput = input
            return asyncChunks(["Hel", "lo"])
          },
          destroy() {
            return undefined
          }
        }
      }
    }
    const result = await streamGeminiNano({
      messages: [
        { role: "user", content: "first" },
        { role: "assistant", content: "ok" },
        { role: "user", content: "second" }
      ],
      onDelta: (text) => deltas.push(text),
      api
    })
    expect(initialPrompts).toEqual([
      { role: "user", content: "first" },
      { role: "assistant", content: "ok" }
    ])
    expect(promptInput).toBe("second")
    expect(deltas).toEqual(["Hel", "lo"])
    expect(result).toEqual({ ok: true, reason: "done" })
  })

  it("converts cumulative stream chunks into deltas", async () => {
    const deltas: string[] = []
    const api: GeminiNanoApi = {
      availability: async () => "available",
      create: async () => ({
        promptStreaming: () => asyncChunks(["Hel", "Hello"]),
        destroy() {
          return undefined
        }
      })
    }
    const result = await streamGeminiNano({
      messages: [{ role: "user", content: "hi" }],
      onDelta: (text) => deltas.push(text),
      api
    })
    expect(deltas).toEqual(["Hel", "lo"])
    expect(result).toEqual({ ok: true, reason: "done" })
  })

  it("returns aborted when the signal is already aborted", async () => {
    const controller = new AbortController()
    controller.abort()
    const api: GeminiNanoApi = {
      availability: async () => "available",
      create: async () => {
        throw new Error("should not create")
      }
    }
    const result = await streamGeminiNano({
      messages: [{ role: "user", content: "hi" }],
      onDelta: () => undefined,
      signal: controller.signal,
      api
    })
    expect(result).toEqual({ ok: true, reason: "aborted" })
  })

  it("treats stream-end errors as done when content was already emitted", async () => {
    const deltas: string[] = []
    const api: GeminiNanoApi = {
      availability: async () => "available",
      create: async () => ({
        promptStreaming: () => ({
          async *[Symbol.asyncIterator]() {
            yield '{"ok":true}'
            const err = new Error("The input is too large.")
            err.name = "QuotaExceededError"
            throw err
          }
        }),
        destroy() {
          return undefined
        }
      })
    }
    const result = await streamGeminiNano({
      messages: [{ role: "user", content: "hi" }],
      onDelta: (text) => deltas.push(text),
      api
    })
    expect(deltas).toEqual(['{"ok":true}'])
    expect(result).toEqual({ ok: true, reason: "done" })
  })

  it("surfaces the error when the stream fails before any content", async () => {
    const api: GeminiNanoApi = {
      availability: async () => "available",
      create: async () => ({
        promptStreaming: () => ({
          async *[Symbol.asyncIterator]() {
            throw new Error("model overloaded")
          }
        }),
        destroy() {
          return undefined
        }
      })
    }
    const result = await streamGeminiNano({
      messages: [{ role: "user", content: "hi" }],
      onDelta: () => undefined,
      api
    })
    expect(result).toEqual({ ok: false, message: "model overloaded" })
  })
})
