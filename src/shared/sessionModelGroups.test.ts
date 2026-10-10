import { describe, expect, it } from "vitest"

import {
  defaultExpandedProviderId,
  groupSessionModelsByProvider
} from "./sessionModelGroups"
import type { SessionModelOption } from "./modelConfig"

function opt(
  providerId: string,
  modelId: string,
  providerLabel: string
): SessionModelOption {
  return {
    key: `${providerId}\u0001${modelId}`,
    providerId,
    modelId,
    providerLabel
  }
}

describe("groupSessionModelsByProvider", () => {
  it("groups by providerId even when labels match", () => {
    const options = [
      opt("a", "m1", "Custom"),
      opt("a", "m2", "Custom"),
      opt("b", "m3", "Custom"),
      opt("nano", "gemini-nano", "Gemini Nano")
    ]
    expect(groupSessionModelsByProvider(options)).toEqual([
      {
        providerId: "a",
        providerLabel: "Custom",
        options: [options[0], options[1]]
      },
      {
        providerId: "b",
        providerLabel: "Custom",
        options: [options[2]]
      },
      {
        providerId: "nano",
        providerLabel: "Gemini Nano",
        options: [options[3]]
      }
    ])
  })
})

describe("defaultExpandedProviderId", () => {
  it("prefers the selected option provider", () => {
    const groups = groupSessionModelsByProvider([
      opt("a", "m1", "A"),
      opt("b", "m2", "B")
    ])
    expect(defaultExpandedProviderId(groups, groups[1]!.options[0])).toBe("b")
  })

  it("falls back to the first group", () => {
    const groups = groupSessionModelsByProvider([opt("a", "m1", "A")])
    expect(defaultExpandedProviderId(groups, undefined)).toBe("a")
  })

  it("returns null when empty", () => {
    expect(defaultExpandedProviderId([], undefined)).toBeNull()
  })
})
