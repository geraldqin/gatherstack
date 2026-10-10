import { listProviderModels, stripModelsResourcePrefix } from "./listProviderModels"
import { t } from "./i18n"

export const MODEL_CONFIG_KEY = "modelConfig"

export const LOCAL_GEMINI_NANO_ID = "local:gemini-nano"
export const GEMINI_NANO_MODEL_ID = "gemini-nano"

export type CloudProviderPreset =
  | "deepseek"
  | "openai"
  | "gemini"
  | "dashscope"
  | "kimi"
  | "zhipu"
  | "doubao"
  | "claude"
  | "grok"
  | "mistral"
  | "groq"
  | "custom"
export type ProviderPreset = CloudProviderPreset | "gemini-nano"

export type ProviderItem = {
  id: string
  preset: ProviderPreset
  name: string
  apiKey: string
  baseUrl: string
  selectedModelId: string | null
}

export type ModelConfig = {
  version: 2
  providers: ProviderItem[]
  activeProviderId: string | null
}

export type ProviderFormInput = {
  preset: CloudProviderPreset
  name: string
  apiKey: string
  baseUrl: string
  selectedModelId: string
}

export type LoadModelConfigResult = {
  config: ModelConfig
  corrupt: boolean
  migrated: boolean
}

export const EMPTY_MODEL_CONFIG: ModelConfig = {
  version: 2,
  providers: [],
  activeProviderId: null
}

export const PRESET_BASE_URL: Record<Exclude<CloudProviderPreset, "custom">, string> = {
  deepseek: "https://api.deepseek.com/v1",
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  dashscope: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  kimi: "https://api.moonshot.cn/v1",
  zhipu: "https://open.bigmodel.cn/api/paas/v4",
  doubao: "https://ark.cn-beijing.volces.com/api/v3",
  claude: "https://api.anthropic.com/v1",
  grok: "https://api.x.ai/v1",
  mistral: "https://api.mistral.ai/v1",
  groq: "https://api.groq.com/openai/v1"
}

export const PRESET_LABELS: Record<ProviderPreset, string> = {
  deepseek: "DeepSeek",
  openai: "OpenAI",
  gemini: "Gemini",
  dashscope: "通义千问",
  kimi: "Kimi",
  zhipu: "智谱",
  doubao: "豆包",
  claude: "Claude",
  grok: "Grok",
  mistral: "Mistral",
  groq: "Groq",
  get custom() {
    return t("modelPresetCustom")
  },
  "gemini-nano": "Gemini Nano"
}

export const GEMINI_NANO_PROVIDER: ProviderItem = {
  id: LOCAL_GEMINI_NANO_ID,
  preset: "gemini-nano",
  name: "Gemini Nano",
  apiKey: "",
  baseUrl: "",
  selectedModelId: GEMINI_NANO_MODEL_ID
}

const CLOUD_PRESETS: CloudProviderPreset[] = [
  "deepseek",
  "openai",
  "gemini",
  "dashscope",
  "kimi",
  "zhipu",
  "doubao",
  "claude",
  "grok",
  "mistral",
  "groq",
  "custom"
]

export function isLocalGeminiNano(provider: ProviderItem | null): boolean {
  return provider?.id === LOCAL_GEMINI_NANO_ID
}

export function resolveBaseUrl(preset: CloudProviderPreset, customUrl: string): string {
  if (preset === "custom") {
    return customUrl.trim().replace(/\/+$/, "")
  }
  return PRESET_BASE_URL[preset]
}

export function displayProviderName(item: ProviderItem): string {
  const trimmed = item.name.trim()
  return trimmed || PRESET_LABELS[item.preset]
}

export function trimProviderForm(input: ProviderFormInput): ProviderFormInput {
  return {
    preset: input.preset,
    name: input.name.trim(),
    apiKey: input.apiKey.trim(),
    baseUrl: resolveBaseUrl(input.preset, input.baseUrl),
    selectedModelId: input.selectedModelId.trim()
  }
}

export function validateProviderForm(input: ProviderFormInput): string | null {
  const fields = trimProviderForm(input)
  if (!fields.apiKey) {
    return t("modelValidateKeyRequired")
  }
  if (input.preset === "custom") {
    if (!fields.name) {
      return t("modelValidateNameRequired")
    }
    if (!fields.baseUrl) {
      return t("modelValidateUrlRequired")
    }
    if (!/^https?:\/\//i.test(fields.baseUrl)) {
      return t("modelValidateUrlScheme")
    }
  }
  return null
}

export function toProviderItem(input: ProviderFormInput, id: string): ProviderItem {
  const fields = trimProviderForm(input)
  return {
    id,
    preset: fields.preset,
    name: fields.name,
    apiKey: fields.apiKey,
    baseUrl: fields.baseUrl,
    selectedModelId: fields.selectedModelId || null
  }
}

export function withCorrectedActiveId(config: ModelConfig): ModelConfig {
  if (config.activeProviderId === LOCAL_GEMINI_NANO_ID) {
    return { ...config, version: 2 }
  }
  if (
    config.activeProviderId !== null &&
    config.providers.some((item) => item.id === config.activeProviderId)
  ) {
    return { ...config, version: 2 }
  }
  return {
    version: 2,
    providers: config.providers,
    activeProviderId: config.providers[0]?.id ?? null
  }
}

export function getActiveProvider(config: ModelConfig): ProviderItem | null {
  const corrected = withCorrectedActiveId(config)
  if (corrected.activeProviderId === LOCAL_GEMINI_NANO_ID) {
    return GEMINI_NANO_PROVIDER
  }
  return (
    corrected.providers.find((item) => item.id === corrected.activeProviderId) ??
    null
  )
}

function isCloudProviderPreset(value: unknown): value is CloudProviderPreset {
  return typeof value === "string" && CLOUD_PRESETS.includes(value as CloudProviderPreset)
}

function isPersistedGeminiNano(value: unknown): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    (value as { preset?: unknown }).preset === "gemini-nano"
  )
}

function isProviderItem(value: unknown): value is ProviderItem {
  if (!value || typeof value !== "object") {
    return false
  }
  const item = value as Record<string, unknown>
  return (
    typeof item.id === "string" &&
    isCloudProviderPreset(item.preset) &&
    typeof item.name === "string" &&
    typeof item.apiKey === "string" &&
    typeof item.baseUrl === "string" &&
    (item.selectedModelId === null || typeof item.selectedModelId === "string")
  )
}

function isLegacyModelItem(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false
  }
  const item = value as Record<string, unknown>
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.apiKey === "string" &&
    typeof item.baseUrl === "string"
  )
}

function migrateLegacy(raw: Record<string, unknown>): ModelConfig {
  const models = Array.isArray(raw.models) ? raw.models : []
  const providers: ProviderItem[] = models.filter(isLegacyModelItem).map((item) => {
    const legacy = item as {
      id: string
      name: string
      apiKey: string
      baseUrl: string
    }
    return {
      id: legacy.id,
      preset: "custom",
      name: legacy.name,
      apiKey: legacy.apiKey,
      baseUrl: legacy.baseUrl,
      selectedModelId: legacy.name.trim() || null
    }
  })
  return withCorrectedActiveId({
    version: 2,
    providers,
    activeProviderId:
      typeof raw.activeModelId === "string" ? raw.activeModelId : null
  })
}

export function parseModelConfig(raw: unknown): LoadModelConfigResult {
  if (raw === undefined || raw === null) {
    return { config: EMPTY_MODEL_CONFIG, corrupt: false, migrated: false }
  }
  if (typeof raw !== "object") {
    return { config: EMPTY_MODEL_CONFIG, corrupt: true, migrated: false }
  }
  const record = raw as Record<string, unknown>
  if (record.version === 2) {
    if (!Array.isArray(record.providers)) {
      return { config: EMPTY_MODEL_CONFIG, corrupt: true, migrated: false }
    }
    const providers = record.providers.filter(
      (item) => !isPersistedGeminiNano(item)
    )
    if (!providers.every(isProviderItem)) {
      return { config: EMPTY_MODEL_CONFIG, corrupt: true, migrated: false }
    }
    if (
      record.activeProviderId !== null &&
      typeof record.activeProviderId !== "string"
    ) {
      return { config: EMPTY_MODEL_CONFIG, corrupt: true, migrated: false }
    }
    return {
      config: withCorrectedActiveId({
        version: 2,
        providers: providers as ProviderItem[],
        activeProviderId: record.activeProviderId ?? null
      }),
      corrupt: false,
      migrated: false
    }
  }
  if (Array.isArray(record.models) && record.models.every(isLegacyModelItem)) {
    return {
      config: migrateLegacy(record),
      corrupt: false,
      migrated: true
    }
  }
  return { config: EMPTY_MODEL_CONFIG, corrupt: true, migrated: false }
}

export function addProviderItem(
  config: ModelConfig,
  input: ProviderFormInput,
  id: string
): ModelConfig {
  const keepActive =
    config.activeProviderId === LOCAL_GEMINI_NANO_ID
      ? LOCAL_GEMINI_NANO_ID
      : config.providers.length === 0
        ? id
        : config.activeProviderId
  const next: ModelConfig = {
    version: 2,
    providers: [...config.providers, toProviderItem(input, id)],
    activeProviderId: keepActive
  }
  return withCorrectedActiveId(next)
}

export function updateProviderItem(
  config: ModelConfig,
  id: string,
  input: ProviderFormInput
): ModelConfig {
  return withCorrectedActiveId({
    version: 2,
    providers: config.providers.map((item) =>
      item.id === id ? toProviderItem(input, id) : item
    ),
    activeProviderId: config.activeProviderId
  })
}

export function removeProviderItem(config: ModelConfig, id: string): ModelConfig {
  const providers = config.providers.filter((item) => item.id !== id)
  const activeProviderId =
    config.activeProviderId === id
      ? (providers[0]?.id ?? null)
      : config.activeProviderId
  return withCorrectedActiveId({ version: 2, providers, activeProviderId })
}

export function setActiveProviderItem(
  config: ModelConfig,
  id: string
): ModelConfig {
  if (id === LOCAL_GEMINI_NANO_ID) {
    return { version: 2, providers: config.providers, activeProviderId: id }
  }
  if (!config.providers.some((item) => item.id === id)) {
    return withCorrectedActiveId(config)
  }
  return { version: 2, providers: config.providers, activeProviderId: id }
}

export async function listModelsForProvider(
  provider: ProviderItem
): Promise<string[]> {
  if (isLocalGeminiNano(provider)) {
    return [GEMINI_NANO_MODEL_ID]
  }
  const listed = await listProviderModels(provider.baseUrl, provider.apiKey)
  const selected = provider.selectedModelId
    ? stripModelsResourcePrefix(provider.selectedModelId)
    : null
  if (!listed.ok) {
    return mergeModelOptions([], selected)
  }
  return mergeModelOptions(listed.ids, selected)
}

export type SessionModelOption = {
  key: string
  providerId: string
  modelId: string
  providerLabel: string
}

/** Side panel may list Nano unless Prompt API reports unavailable. */
export function canSelectGeminiNanoInSession(
  availability: string
): boolean {
  return availability !== "unavailable"
}

/** Drop Gemini Nano from the picker when the device reports unavailable. */
export function excludeUnavailableGeminiNano(
  options: SessionModelOption[],
  availability: string
): SessionModelOption[] {
  if (canSelectGeminiNanoInSession(availability)) {
    return options
  }
  return options.filter((item) => item.providerId !== LOCAL_GEMINI_NANO_ID)
}

const SESSION_MODEL_KEY_SEP = "\u0001"

export function sessionModelOptionKey(
  providerId: string,
  modelId: string
): string {
  return `${providerId}${SESSION_MODEL_KEY_SEP}${modelId}`
}

export function parseSessionModelOptionKey(
  key: string
): { providerId: string; modelId: string } | null {
  const index = key.indexOf(SESSION_MODEL_KEY_SEP)
  if (index <= 0 || index === key.length - 1) {
    return null
  }
  return {
    providerId: key.slice(0, index),
    modelId: key.slice(index + SESSION_MODEL_KEY_SEP.length)
  }
}

export function findProviderById(
  config: ModelConfig,
  providerId: string
): ProviderItem | null {
  if (providerId === LOCAL_GEMINI_NANO_ID) {
    return GEMINI_NANO_PROVIDER
  }
  return (
    withCorrectedActiveId(config).providers.find(
      (item) => item.id === providerId
    ) ?? null
  )
}

/** Saved defaults only — no network. Used when the sidepanel opens. */
export function sessionModelOptionsFromConfig(
  config: ModelConfig
): SessionModelOption[] {
  const corrected = withCorrectedActiveId(config)
  const providers = [...corrected.providers, GEMINI_NANO_PROVIDER]
  const options: SessionModelOption[] = []
  for (const provider of providers) {
    const raw = isLocalGeminiNano(provider)
      ? (provider.selectedModelId ?? GEMINI_NANO_MODEL_ID)
      : provider.selectedModelId
    if (!raw) {
      continue
    }
    const modelId = stripModelsResourcePrefix(raw)
    options.push({
      key: sessionModelOptionKey(provider.id, modelId),
      providerId: provider.id,
      modelId,
      providerLabel: displayProviderName(provider)
    })
  }
  return options
}

/** All selectable models: each cloud provider (in order), then Gemini Nano. */
export async function listAllSessionModelOptions(
  config: ModelConfig
): Promise<SessionModelOption[]> {
  const corrected = withCorrectedActiveId(config)
  const providers = [...corrected.providers, GEMINI_NANO_PROVIDER]
  const chunks = await Promise.all(
    providers.map(async (provider) => {
      const models = await listModelsForProvider(provider)
      const providerLabel = displayProviderName(provider)
      return models.map(
        (modelId): SessionModelOption => ({
          key: sessionModelOptionKey(provider.id, modelId),
          providerId: provider.id,
          modelId,
          providerLabel
        })
      )
    })
  )
  return chunks.flat()
}

export function mergeModelOptions(
  fetchedIds: string[],
  ...extra: Array<string | null>
): string[] {
  const ids = new Set(fetchedIds)
  for (const id of extra) {
    if (id) {
      ids.add(id)
    }
  }
  return [...ids]
}

export function resolveSessionModelId(
  options: string[],
  fallbackId: string | null,
  selectedId: string | null
): string | null {
  if (selectedId && options.includes(selectedId)) {
    return selectedId
  }
  if (fallbackId) {
    return fallbackId
  }
  return options[0] ?? null
}

export function resolveSessionModelOptionKey(
  options: SessionModelOption[],
  config: ModelConfig,
  prevKey: string | null
): string | null {
  if (prevKey && options.some((item) => item.key === prevKey)) {
    return prevKey
  }
  const active = getActiveProvider(config)
  if (!active) {
    return options[0]?.key ?? null
  }
  if (active.selectedModelId) {
    const exact = options.find(
      (item) =>
        item.providerId === active.id && item.modelId === active.selectedModelId
    )
    if (exact) {
      return exact.key
    }
  }
  return (
    options.find((item) => item.providerId === active.id)?.key ??
    options[0]?.key ??
    null
  )
}

export async function loadModelConfig(): Promise<LoadModelConfigResult> {
  try {
    const result = await chrome.storage.sync.get(MODEL_CONFIG_KEY)
    if (!(MODEL_CONFIG_KEY in result)) {
      return { config: EMPTY_MODEL_CONFIG, corrupt: false, migrated: false }
    }
    const parsed = parseModelConfig(result[MODEL_CONFIG_KEY])
    if (parsed.migrated) {
      await persistModelConfig(parsed.config)
    }
    return parsed
  } catch {
    return { config: EMPTY_MODEL_CONFIG, corrupt: true, migrated: false }
  }
}

export async function persistModelConfig(config: ModelConfig): Promise<void> {
  await chrome.storage.sync.set({
    [MODEL_CONFIG_KEY]: withCorrectedActiveId(config)
  })
}

export function subscribeModelConfig(
  listener: (config: ModelConfig) => void
): () => void {
  function onChanged(
    changes: Record<string, { newValue?: unknown }>,
    areaName: string
  ) {
    if (areaName !== "sync" || !(MODEL_CONFIG_KEY in changes)) {
      return
    }
    listener(parseModelConfig(changes[MODEL_CONFIG_KEY].newValue).config)
  }

  chrome.storage.onChanged.addListener(onChanged)
  return () => {
    chrome.storage.onChanged.removeListener(onChanged)
  }
}
