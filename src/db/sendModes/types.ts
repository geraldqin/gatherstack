export type SendModeOrigin = "builtin" | "user"

export type BuiltinSendModeId =
  | "chat"
  | "directStore"
  | "asyncParse"
  | "oneClickCollect"

export type SendModeDocument = {
  id: string
  name: string
  description: string
  createdAt: number
  updatedAt: number
  origin: SendModeOrigin
  builtinId?: string
  version?: string
  callModel: boolean
  autoSave: boolean
  includeHistory: boolean
  async: boolean
  /** Only meaningful when async === true */
  maxConcurrent?: number
}

export type SendModeFlags = {
  callModel: boolean
  autoSave: boolean
  includeHistory: boolean
  async: boolean
  maxConcurrent?: number
}
