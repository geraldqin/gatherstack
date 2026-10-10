import { describe, expect, it } from "vitest"

import { t } from "./i18n"
import {
  colorKeyForModeId,
  DEFAULT_SEND_MODE,
  getSendModeOptions,
  normalizeSendMode,
  resolveOption,
  sendModeColorKey,
  sendModeDocumentsToOptions,
  sendModeFlagsSummary,
  sendModeLabel,
  sendModeMenuAccentClass,
  sendModeMenuOptionClass,
  sendModePickerTriggerClass,
  sendModePrimaryButtonClass
} from "./sendMode"
import { resolveSendModeDocument, sortSendModeDocuments } from "./sendModeResolve"
import type { SendModeDocument } from "~db/sendModes/types"

describe("normalizeSendMode", () => {
  it("falls back to chat for empty", () => {
    expect(normalizeSendMode(undefined)).toBe(DEFAULT_SEND_MODE)
    expect(normalizeSendMode(null)).toBe("chat")
    expect(normalizeSendMode("")).toBe("chat")
  })

  it("keeps arbitrary ids", () => {
    expect(normalizeSendMode("directStore")).toBe("directStore")
    expect(normalizeSendMode("asyncParse")).toBe("asyncParse")
    expect(normalizeSendMode("custom-uuid")).toBe("custom-uuid")
  })
})

describe("sendModeLabel / getSendModeOptions", () => {
  it("returns four builtins", () => {
    expect(sendModeLabel("chat")).toBe(t("sendModeChatLabel"))
    expect(sendModeLabel("directStore")).toBe(t("sendModeDirectStoreLabel"))
    expect(sendModeLabel("asyncParse")).toBe(t("sendModeAsyncParseLabel"))
    expect(sendModeLabel("oneClickCollect")).toBe(
      t("sendModeOneClickCollectLabel")
    )

    const options = getSendModeOptions()
    expect(options).toHaveLength(4)
    expect(options[0]?.label).toBe(t("sendModeChatLabel"))
    expect(options[3]?.label).toBe(t("sendModeOneClickCollectLabel"))
  })

  it("sidepanel descriptions use flags summary like settings", () => {
    expect(sendModeFlagsSummary({
      callModel: true,
      autoSave: false,
      includeHistory: true,
      async: false
    })).toBe(
      [t("sendModeFlagModel"), t("sendModeFlagManualSave"), t("sendModeFlagHistory")].join(
        " · "
      )
    )
    expect(getSendModeOptions()[0]?.description).toBe(
      sendModeFlagsSummary({
        callModel: true,
        autoSave: false,
        includeHistory: true,
        async: false
      })
    )
    const docs: SendModeDocument[] = [
      {
        id: "uuid-chat",
        name: "正常对话",
        description: "请求大模型",
        createdAt: 1,
        updatedAt: 1,
        origin: "builtin",
        builtinId: "chat",
        callModel: true,
        autoSave: false,
        includeHistory: true,
        async: false
      }
    ]
    expect(sendModeDocumentsToOptions(docs)[0]?.description).toBe(
      sendModeFlagsSummary(docs[0]!)
    )
    expect(sendModeDocumentsToOptions(docs)[0]?.description).not.toBe(
      "请求大模型"
    )
  })
})

describe("sendMode color classes", () => {
  it("maps color keys", () => {
    expect(sendModePrimaryButtonClass("chat")).toContain("bg-slate-800")
    expect(sendModePrimaryButtonClass("directStore")).toContain("bg-emerald-600")
    expect(sendModePrimaryButtonClass("asyncParse")).toContain("bg-violet-600")
    expect(sendModePrimaryButtonClass("oneClickCollect")).toContain(
      "bg-amber-600"
    )
    expect(sendModePickerTriggerClass("directStore")).toContain("text-emerald-700")
    expect(sendModePickerTriggerClass("oneClickCollect")).toContain(
      "text-amber-700"
    )
    expect(sendModeMenuOptionClass("chat", true)).toContain("bg-slate-100")
    expect(sendModeMenuOptionClass("oneClickCollect", true)).toContain(
      "bg-amber-50"
    )
    expect(sendModeMenuAccentClass("asyncParse")).toContain("text-violet-700")
    expect(sendModeMenuAccentClass("oneClickCollect")).toContain(
      "text-amber-700"
    )
  })

  it("sendModeColorKey prefers builtin oneClickCollect over custom heuristics", () => {
    expect(
      sendModeColorKey({
        builtinId: "oneClickCollect",
        callModel: true,
        async: false
      })
    ).toBe("oneClickCollect")
  })

  it("colorKeyForModeId uses options", () => {
    const options = getSendModeOptions()
    expect(colorKeyForModeId("directStore", options)).toBe("directStore")
    expect(resolveOption("missing", options).id).toBe("chat")
  })
})

describe("resolveSendModeDocument", () => {
  const modes: SendModeDocument[] = [
    {
      id: "uuid-chat",
      name: "正常对话",
      description: "",
      createdAt: 1,
      updatedAt: 1,
      origin: "builtin",
      builtinId: "chat",
      callModel: true,
      autoSave: false,
      includeHistory: true,
      async: false
    },
    {
      id: "uuid-custom",
      name: "自定义",
      description: "",
      createdAt: 2,
      updatedAt: 2,
      origin: "user",
      callModel: true,
      autoSave: true,
      includeHistory: false,
      async: true,
      maxConcurrent: 3
    }
  ]

  it("resolves by builtinId short name", () => {
    expect(resolveSendModeDocument(modes, "chat").id).toBe("uuid-chat")
  })

  it("resolves by document id", () => {
    expect(resolveSendModeDocument(modes, "uuid-custom").name).toBe("自定义")
  })

  it("falls back to chat when missing", () => {
    expect(resolveSendModeDocument(modes, "gone").builtinId).toBe("chat")
  })
})

describe("sortSendModeDocuments", () => {
  function doc(
    partial: Pick<SendModeDocument, "id" | "origin" | "createdAt"> &
      Partial<SendModeDocument>
  ): SendModeDocument {
    return {
      name: partial.id,
      description: "",
      updatedAt: partial.updatedAt ?? partial.createdAt,
      callModel: true,
      autoSave: false,
      includeHistory: true,
      async: false,
      ...partial
    }
  }

  it("puts user copies first by createdAt descending, then builtins in seed order", () => {
    const sorted = sortSendModeDocuments([
      doc({
        id: "chat",
        origin: "builtin",
        builtinId: "chat",
        createdAt: 1
      }),
      doc({
        id: "older-copy",
        origin: "user",
        createdAt: 10,
        updatedAt: 999
      }),
      doc({
        id: "asyncParse",
        origin: "builtin",
        builtinId: "asyncParse",
        createdAt: 1
      }),
      doc({
        id: "newer-copy",
        origin: "user",
        createdAt: 20,
        updatedAt: 20
      }),
      doc({
        id: "directStore",
        origin: "builtin",
        builtinId: "directStore",
        createdAt: 1
      }),
      doc({
        id: "oneClickCollect",
        origin: "builtin",
        builtinId: "oneClickCollect",
        createdAt: 1
      })
    ])
    expect(sorted.map((m) => m.id)).toEqual([
      "newer-copy",
      "older-copy",
      "chat",
      "directStore",
      "asyncParse",
      "oneClickCollect"
    ])
  })
})
