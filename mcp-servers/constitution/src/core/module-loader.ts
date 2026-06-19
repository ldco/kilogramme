import type { ConstitutionConfig, LanguageModule } from '../types.js'
import { t } from '../i18n/index.js'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function findConfig(): ConstitutionConfig {
  const cwd = process.cwd()
  const paths = [join(cwd, '.nocowboyrc'), join(cwd, '.nocowboyrc.json'), join(cwd, '.constitutionrc')]
  for (const p of paths) {
    if (existsSync(p)) {
      try {
        const raw = readFileSync(p, 'utf-8')
        const parsed = JSON.parse(raw)
        return { modules: parsed?.constitution?.modules ?? parsed?.modules ?? ['typescript'] }
      } catch { return { modules: ['typescript'] } }
    }
  }
  return { modules: ['typescript'] }
}

export async function loadModules(config: ConstitutionConfig): Promise<Map<string, LanguageModule>> {
  const modules = new Map<string, LanguageModule>()
  const modulesDir = join(__dirname, '..', 'modules')

  for (const name of config.modules) {
    try {
      const modPath = join(modulesDir, name, 'rules.js')
      if (!existsSync(modPath)) {
        console.error(t('constitution.module.notFound', { name, path: modPath }))
        continue
      }
      const mod = await import(`../modules/${name}/rules.js`)
      const def: LanguageModule = {
        name: mod.moduleName || name,
        extensions: mod.extensions || [],
        rules: mod.rules || [],
      }
      modules.set(name, def)
      console.error(t('constitution.module.loaded', { name, count: String(def.rules.length) }))
    } catch (err) {
      console.error(t('constitution.module.failed', { name, error: String(err) }))
    }
  }
  return modules
}
