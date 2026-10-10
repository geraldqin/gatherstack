import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("./listProviderModels", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./listProviderModels")>()
  return {
    ...actual,
    listProviderModels: vi.fn(async () => ({
      ok: true as const,
      ids: ["deepseek-chat", "deepseek-reasoner"]
    }))
  }
})

import {
  addProviderItem,
  canSelectGeminiNanoInSession,
  displayProviderName,
  excludeUnavailableGeminiNano,
  GEMINI_NANO_MODEL_ID,
  GEMINI_NANO_PROVIDER,
  getActiveProvider,
  isLocalGeminiNano,
  listAllSessionModelOptions,
  listModelsForProvider,
  LOCAL_GEMINI_NANO_ID,
  parseModelConfig,
  resolveBaseUrl,
  resolveSessionModelOptionKey,
  sessionModelOptionKey,
  sessionModelOptionsFromConfig,
  setActiveProviderItem,
  toProviderItem,
  validateProviderForm,
  withCorrectedActiveId,
  type ModelConfig,
  type ProviderFormInput
} from "./modelConfig"
import { listProviderModels } from "./listProviderModels"

beforeEach(() => {
  vi.mocked(listProviderModels).mockClear()
})

const empty: ModelConfig = {
  version: 2,
  providers: [],
  activeProviderId: null
}

const cloudInput: ProviderFormInput = {
  preset: "deepseek",
  name: "",
  apiKey: "k",
  baseUrl: "",
  selectedModelId: "deepseek-chat"
}

describe("isLocalGeminiNano", () => {
  it("matches the built-in nano provider", () => {
    expect(isLocalGeminiNano(GEMINI_NANO_PROVIDER)).toBe(true)
    expect(isLocalGeminiNano(null)).toBe(false)
  })
})

describe("withCorrectedActiveId", () => {
  it("keeps the nano id when providers are empty", () => {
    const next = withCorrectedActiveId({
      version: 2,
      providers: [],
      activeProviderId: LOCAL_GEMINI_NANO_ID
    })
    expect(next.activeProviderId).toBe(LOCAL_GEMINI_NANO_ID)
  })

  it("falls back to first cloud provider when active id is missing", () => {
    const config = addProviderItem(empty, cloudInput, "p1")
    const next = withCorrectedActiveId({
      ...config,
      activeProviderId: "missing"
    })
    expect(next.activeProviderId).toBe("p1")
  })
})

describe("getActiveProvider", () => {
  it("returns the synthetic nano item", () => {
    const provider = getActiveProvider({
      version: 2,
      providers: [],
      activeProviderId: LOCAL_GEMINI_NANO_ID
    })
    expect(provider).toEqual(GEMINI_NANO_PROVIDER)
    expect(provider?.selectedModelId).toBe(GEMINI_NANO_MODEL_ID)
  })
})

describe("setActiveProviderItem", () => {
  it("can set nano as current", () => {
    const next = setActiveProviderItem(empty, LOCAL_GEMINI_NANO_ID)
    expect(next.activeProviderId).toBe(LOCAL_GEMINI_NANO_ID)
  })
})

describe("addProviderItem", () => {
  it("does not steal current when nano is active", () => {
    const nanoCurrent: ModelConfig = {
      version: 2,
      providers: [],
      activeProviderId: LOCAL_GEMINI_NANO_ID
    }
    const next = addProviderItem(nanoCurrent, cloudInput, "p1")
    expect(next.activeProviderId).toBe(LOCAL_GEMINI_NANO_ID)
    expect(next.providers).toHaveLength(1)
  })
})

describe("gemini cloud preset", () => {
  it("resolves the OpenAI-compatible Gemini base URL", () => {
    expect(resolveBaseUrl("gemini", "https://ignored.example/")).toBe(
      "https://generativelanguage.googleapis.com/v1beta/openai"
    )
  })

  it("requires key only and accepts empty name", () => {
    expect(
      validateProviderForm({
        preset: "gemini",
        name: "",
        apiKey: "k",
        baseUrl: "",
        selectedModelId: "gemini-2.5-flash"
      })
    ).toBeNull()
    expect(
      validateProviderForm({
        preset: "gemini",
        name: "",
        apiKey: "",
        baseUrl: "",
        selectedModelId: ""
      })
    ).toBe("请填写 Key")
  })

  it("parses a saved gemini provider without corrupt", () => {
    const parsed = parseModelConfig({
      version: 2,
      providers: [
        {
          id: "g1",
          preset: "gemini",
          name: "",
          apiKey: "k",
          baseUrl:
            "https://generativelanguage.googleapis.com/v1beta/openai",
          selectedModelId: "gemini-2.5-flash"
        }
      ],
      activeProviderId: "g1"
    })
    expect(parsed.corrupt).toBe(false)
    expect(parsed.config.providers[0]?.preset).toBe("gemini")
    expect(displayProviderName(parsed.config.providers[0]!)).toBe("Gemini")
  })

  it("toProviderItem fills gemini baseUrl from preset", () => {
    const item = toProviderItem(
      {
        preset: "gemini",
        name: "",
        apiKey: "k",
        baseUrl: "",
        selectedModelId: "gemini-2.5-flash"
      },
      "g1"
    )
    expect(item.baseUrl).toBe(
      "https://generativelanguage.googleapis.com/v1beta/openai"
    )
    expect(item.preset).toBe("gemini")
  })
})

describe("expanded cloud presets", () => {
  const cases: Array<{
    preset:
      | "dashscope"
      | "kimi"
      | "zhipu"
      | "doubao"
      | "claude"
      | "grok"
      | "mistral"
      | "groq"
    baseUrl: string
    label: string
  }> = [
    {
      preset: "dashscope",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      label: "通义千问"
    },
    {
      preset: "kimi",
      baseUrl: "https://api.moonshot.cn/v1",
      label: "Kimi"
    },
    {
      preset: "zhipu",
      baseUrl: "https://open.bigmodel.cn/api/paas/v4",
      label: "智谱"
    },
    {
      preset: "doubao",
      baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
      label: "豆包"
    },
    {
      preset: "claude",
      baseUrl: "https://api.anthropic.com/v1",
      label: "Claude"
    },
    {
      preset: "grok",
      baseUrl: "https://api.x.ai/v1",
      label: "Grok"
    },
    {
      preset: "mistral",
      baseUrl: "https://api.mistral.ai/v1",
      label: "Mistral"
    },
    {
      preset: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      label: "Groq"
    }
  ]

  it.each(cases)("resolves $preset baseUrl and label", ({ preset, baseUrl, label }) => {
    expect(resolveBaseUrl(preset, "https://ignored.example/")).toBe(baseUrl)
    expect(
      displayProviderName({
        id: "x",
        preset,
        name: "",
        apiKey: "k",
        baseUrl,
        selectedModelId: "m"
      })
    ).toBe(label)
  })

  it("requires key only for dashscope and claude", () => {
    for (const preset of ["dashscope", "claude"] as const) {
      expect(
        validateProviderForm({
          preset,
          name: "",
          apiKey: "k",
          baseUrl: "",
          selectedModelId: "m"
        })
      ).toBeNull()
      expect(
        validateProviderForm({
          preset,
          name: "",
          apiKey: "",
          baseUrl: "",
          selectedModelId: ""
        })
      ).toBe("请填写 Key")
    }
  })

  it("parses saved kimi and groq providers without corrupt", () => {
    const parsed = parseModelConfig({
      version: 2,
      providers: [
        {
          id: "k1",
          preset: "kimi",
          name: "",
          apiKey: "k",
          baseUrl: "https://api.moonshot.cn/v1",
          selectedModelId: "moonshot-v1-8k"
        },
        {
          id: "g1",
          preset: "groq",
          name: "",
          apiKey: "k",
          baseUrl: "https://api.groq.com/openai/v1",
          selectedModelId: "llama-3.3-70b-versatile"
        }
      ],
      activeProviderId: "k1"
    })
    expect(parsed.corrupt).toBe(false)
    expect(parsed.config.providers.map((p) => p.preset)).toEqual([
      "kimi",
      "groq"
    ])
  })

  it("toProviderItem fills zhipu baseUrl from preset", () => {
    const item = toProviderItem(
      {
        preset: "zhipu",
        name: "",
        apiKey: "k",
        baseUrl: "",
        selectedModelId: "glm-4"
      },
      "z1"
    )
    expect(item.baseUrl).toBe("https://open.bigmodel.cn/api/paas/v4")
    expect(item.preset).toBe("zhipu")
  })
})

describe("parseModelConfig", () => {
  it("drops persisted gemini-nano rows from providers", () => {
    const parsed = parseModelConfig({
      version: 2,
      providers: [
        {
          id: "x",
          preset: "gemini-nano",
          name: "Gemini Nano",
          apiKey: "",
          baseUrl: "",
          selectedModelId: "gemini-nano"
        }
      ],
      activeProviderId: LOCAL_GEMINI_NANO_ID
    })
    expect(parsed.corrupt).toBe(false)
    expect(parsed.config.providers).toEqual([])
    expect(parsed.config.activeProviderId).toBe(LOCAL_GEMINI_NANO_ID)
  })
})

describe("listModelsForProvider", () => {
  it("returns the fixed nano model id without fetching", async () => {
    const ids = await listModelsForProvider(GEMINI_NANO_PROVIDER)
    expect(ids).toEqual([GEMINI_NANO_MODEL_ID])
  })
})

describe("sessionModelOptionsFromConfig", () => {
  it("builds options from saved defaults without fetching provider models", () => {
    const config = addProviderItem(empty, cloudInput, "p1")
    const options = sessionModelOptionsFromConfig(config)
    expect(listProviderModels).not.toHaveBeenCalled()
    expect(options.map((item) => [item.providerId, item.modelId])).toEqual([
      ["p1", "deepseek-chat"],
      [LOCAL_GEMINI_NANO_ID, GEMINI_NANO_MODEL_ID]
    ])
    expect(resolveSessionModelOptionKey(options, config, null)).toBe(
      sessionModelOptionKey("p1", "deepseek-chat")
    )
  })

  it("skips cloud providers that have no selected model", () => {
    const config = addProviderItem(
      empty,
      { ...cloudInput, selectedModelId: "" },
      "p1"
    )
    const options = sessionModelOptionsFromConfig(config)
    expect(options.map((item) => item.providerId)).toEqual([LOCAL_GEMINI_NANO_ID])
  })
})

describe("listAllSessionModelOptions", () => {
  it("lists cloud models then nano, grouped by provider order", async () => {
    const config = addProviderItem(empty, cloudInput, "p1")
    const options = await listAllSessionModelOptions(config)
    expect(options.map((item) => [item.providerId, item.modelId])).toEqual([
      ["p1", "deepseek-chat"],
      ["p1", "deepseek-reasoner"],
      [LOCAL_GEMINI_NANO_ID, GEMINI_NANO_MODEL_ID]
    ])
    expect(options[0]?.providerLabel).toBe("DeepSeek")
    expect(options.at(-1)?.providerLabel).toBe("Gemini Nano")
  })
})

describe("excludeUnavailableGeminiNano", () => {
  const nano = {
    key: sessionModelOptionKey(LOCAL_GEMINI_NANO_ID, GEMINI_NANO_MODEL_ID),
    providerId: LOCAL_GEMINI_NANO_ID,
    modelId: GEMINI_NANO_MODEL_ID,
    providerLabel: "Gemini Nano"
  }
  const cloud = {
    key: sessionModelOptionKey("p1", "deepseek-chat"),
    providerId: "p1",
    modelId: "deepseek-chat",
    providerLabel: "DeepSeek"
  }

  it("keeps Nano unless availability is unavailable", () => {
    expect(canSelectGeminiNanoInSession("available")).toBe(true)
    expect(canSelectGeminiNanoInSession("downloadable")).toBe(true)
    expect(canSelectGeminiNanoInSession("unavailable")).toBe(false)
    expect(
      excludeUnavailableGeminiNano([cloud, nano], "available")
    ).toEqual([cloud, nano])
    expect(
      excludeUnavailableGeminiNano([cloud, nano], "downloadable")
    ).toEqual([cloud, nano])
  })

  it("removes Nano when unavailable", () => {
    expect(
      excludeUnavailableGeminiNano([cloud, nano], "unavailable")
    ).toEqual([cloud])
  })
})

describe("resolveSessionModelOptionKey", () => {
  it("prefers the active provider default model", async () => {
    const config = setActiveProviderItem(
      addProviderItem(empty, cloudInput, "p1"),
      LOCAL_GEMINI_NANO_ID
    )
    const options = await listAllSessionModelOptions(config)
    expect(resolveSessionModelOptionKey(options, config, null)).toBe(
      sessionModelOptionKey(LOCAL_GEMINI_NANO_ID, GEMINI_NANO_MODEL_ID)
    )
  })
})
