import { describe, expect, it } from "vitest"

import {
  DB_NAME,
  DB_VERSION,
  MAX_SESSION_BYTES,
  MAX_SESSION_MESSAGES,
  MAX_SESSIONS,
  STORE_CHAT_SESSIONS,
  STORE_RECORDS,
  STORE_SEND_MODES,
  STORE_SKILLS,
  TITLE_MAX
} from "."

describe("schema", () => {
  it("exports database identity constants", () => {
    expect(DB_NAME).toBe("local-brain-db")
    expect(DB_VERSION).toBe(5)
    expect(STORE_RECORDS).toBe("records")
    expect(STORE_CHAT_SESSIONS).toBe("chatSessions")
    expect(STORE_SKILLS).toBe("skills")
    expect(STORE_SEND_MODES).toBe("sendModes")
  })

  it("exports chat session limits", () => {
    expect(MAX_SESSION_MESSAGES).toBe(40)
    expect(MAX_SESSION_BYTES).toBe(2 * 1024 * 1024)
    expect(MAX_SESSIONS).toBe(30)
    expect(TITLE_MAX).toBe(40)
  })
})
