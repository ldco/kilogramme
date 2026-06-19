export type I18nDict = Record<string, any>

export function createI18n(locale: I18nDict) {
  return (key: string, params?: Record<string, string | number>): string => {
    const parts = key.split('.')
    let current: any = locale
    for (const part of parts) {
      if (current == null || typeof current !== 'object') return key
      current = current[part]
    }
    if (typeof current !== 'string') return key
    if (!params) return current
    let result = current
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(`{${k}}`, String(v))
    }
    return result
  }
}
