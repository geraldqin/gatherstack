import { describe, expect, it } from "vitest"

import { stripModelsResourcePrefix } from "./listProviderModels"

describe("stripModelsResourcePrefix", () => {
  it("strips the Google resource prefix", () => {
    expect(stripModelsResourcePrefix("models/gemini-2.5-flash")).toBe(
      "gemini-2.5-flash"
    )
  })

  it("leaves other ids unchanged", () => {
    expect(stripModelsResourcePrefix("deepseek-chat")).toBe("deepseek-chat")
    expect(stripModelsResourcePrefix("models")).toBe("models")
  })
})
