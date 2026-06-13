import type { PmTool } from './index.js'
import { npmScript, fileExists } from './utils.js'

function makeDbTool(
  name: string,
  description: string,
  script: string,
  needsDbFile = false,
): PmTool {
  return {
    name,
    description,
    inputSchema: {
      type: 'object',
      properties: {},
    },
    async handler() {
      if (needsDbFile && !fileExists('data/sqlite.db')) {
        return 'No database file found at data/sqlite.db. Run pm_db_push first.'
      }
      const output = npmScript(script)
      return output || `${name} completed successfully.`
    },
  }
}

export const dbTools: PmTool[] = [
  makeDbTool(
    'pm_db_push',
    'Push Drizzle ORM schema to SQLite database. Creates the database file and applies schema changes.',
    'db:push',
  ),
  makeDbTool(
    'pm_db_seed',
    'Seed the database with initial data (users, roles, sample content). Requires an existing database.',
    'db:seed',
    true,
  ),
  makeDbTool(
    'pm_db_reset',
    'Reset the database: delete the SQLite file, re-run migrations, and seed with initial data.',
    'db:reset',
  ),
  makeDbTool(
    'pm_db_migrate',
    'Run Drizzle migrations against the database.',
    'db:migrate',
    true,
  ),
  makeDbTool(
    'pm_db_studio',
    'Open Drizzle Studio (web UI for browsing the database).',
    'db:studio',
  ),
]
