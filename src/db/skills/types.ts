export type SkillOrigin = "builtin" | "user"

export type SkillDocument = {
  id: string
  name: string
  filename: string
  markdown: string
  createdAt: number
  updatedAt: number
  origin: SkillOrigin
  builtinId?: string
  version?: string
}
