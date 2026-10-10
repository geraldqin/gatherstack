import { t } from "./i18n"

export function modelsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/models`
}

/** Google resource ids look like `models/gemini-2.5-flash`; chat wants the short id. */
export function stripModelsResourcePrefix(modelId: string): string {
  return modelId.startsWith("models/") ? modelId.slice("models/".length) : modelId
}

export type ListModelsResult =
  | { ok: true; ids: string[] }
  | { ok: false; message: string }

function failMessage(): string {
  return t("modelListFetchFailed")
}

function collectIds(data: unknown[]): string[] {
  const ids = new Set<string>()
  for (const item of data) {
    if (!item || typeof item !== "object") {
      continue
    }
    const id = (item as { id?: unknown }).id
    if (typeof id === "string" && id.trim()) {
      ids.add(stripModelsResourcePrefix(id.trim()))
    }
  }
  return [...ids].sort()
}

export async function listProviderModels(
  baseUrl: string,
  apiKey: string
): Promise<ListModelsResult> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(modelsUrl(baseUrl), {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      signal: controller.signal
    })
    if (!response.ok) {
      return { ok: false, message: failMessage() }
    }
    const json: unknown = await response.json()
    if (!json || typeof json !== "object" || !Array.isArray((json as { data?: unknown }).data)) {
      return { ok: false, message: failMessage() }
    }
    return { ok: true, ids: collectIds((json as { data: unknown[] }).data) }
  } catch {
    return { ok: false, message: failMessage() }
  } finally {
    window.clearTimeout(timer)
  }
}
