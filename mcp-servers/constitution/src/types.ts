export interface Violation {
  rule: string
  language: string
  severity: 'error' | 'warning'
  file: string
  line: number
  column: number
  message: string
  suggestion?: string
  auto_fixable: boolean
}

export interface Rule {
  id: string
  language: string
  severity: 'error' | 'warning'
  description: string
  auto_fixable: boolean
  check(source: string, filename: string): Violation[]
}

export interface LanguageModule {
  name: string
  extensions: string[]
  rules: Rule[]
}

export interface ConstitutionConfig {
  modules: string[]
}

export interface CheckFileResult {
  violations: Violation[]
  pass: boolean
  file: string
  language: string
  rules_checked: number
}

export interface CheckProjectResult {
  files_checked: number
  files_with_violations: number
  violations: Violation[]
  pass: boolean
  summary: string
}

declare global {
  var __constitution_modules: Map<string, LanguageModule> | undefined
}

export {}
