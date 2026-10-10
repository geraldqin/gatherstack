import {
  clampMaxConcurrent,
  DEFAULT_MAX_CONCURRENT
} from "~db/sendModes/normalize"

import type {
  AsyncParseJob,
  AsyncParseJobEnqueueInput,
  AsyncParseJobRunner,
  AsyncParseJobRunnerSnapshot
} from "./types"

export function createAsyncParseJobRunner(
  maxConcurrent: number = DEFAULT_MAX_CONCURRENT
): AsyncParseJobRunner {
  let queued: AsyncParseJob[] = []
  let running: AsyncParseJob[] = []
  let limit = clampMaxConcurrent(maxConcurrent)
  const abortByJobId = new Map<string, AbortController>()
  const listeners = new Set<() => void>()

  function notify(): void {
    for (const listener of listeners) {
      listener()
    }
  }

  function snapshot(): AsyncParseJobRunnerSnapshot {
    return {
      queued: [...queued],
      running: [...running],
      maxConcurrent: limit
    }
  }

  return {
    getSnapshot: snapshot,

    setMaxConcurrent(n: number) {
      limit = clampMaxConcurrent(n)
      notify()
    },

    enqueue(input: AsyncParseJobEnqueueInput): AsyncParseJob {
      const job: AsyncParseJob = {
        ...input,
        phase: "queued"
      }
      queued = [...queued, job]
      notify()
      return job
    },

    takeNextToStart(): AsyncParseJob | null {
      if (running.length >= limit || queued.length === 0) {
        return null
      }
      const [next, ...rest] = queued
      if (!next) {
        return null
      }
      queued = rest
      const started: AsyncParseJob = { ...next, phase: "running" }
      running = [...running, started]
      abortByJobId.set(started.id, new AbortController())
      notify()
      return started
    },

    markRunningIds(jobId, userMessageId, assistantMessageId) {
      running = running.map((job) =>
        job.id === jobId
          ? { ...job, userMessageId, assistantMessageId }
          : job
      )
      notify()
    },

    finish(jobId: string) {
      running = running.filter((job) => job.id !== jobId)
      abortByJobId.delete(jobId)
      notify()
    },

    cancel(jobIds: string[]) {
      const idSet = new Set(jobIds)
      const abortedAssistantIds: string[] = []

      for (const job of running) {
        if (!idSet.has(job.id)) {
          continue
        }
        abortByJobId.get(job.id)?.abort()
        if (job.assistantMessageId) {
          abortedAssistantIds.push(job.assistantMessageId)
        }
      }

      running = running.filter((job) => {
        if (!idSet.has(job.id)) {
          return true
        }
        abortByJobId.delete(job.id)
        return false
      })
      queued = queued.filter((job) => !idSet.has(job.id))
      notify()
      return { abortedAssistantIds }
    },

    cancelSession(sessionId: string) {
      const ids = [...queued, ...running]
        .filter((job) => job.sessionId === sessionId)
        .map((job) => job.id)
      return this.cancel(ids)
    },

    findByAssistantMessageId(id: string) {
      return running.find((job) => job.assistantMessageId === id)
    },

    getAbortController(jobId: string) {
      return abortByJobId.get(jobId)
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}
