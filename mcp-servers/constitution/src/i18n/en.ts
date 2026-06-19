const en = {
  constitution: {
    rule: {
      noAnyType: {
        message: 'Use a specific type instead of `any`.',
        suggestion: 'Replace `any` with the actual type (string, number, interface, etc.)',
      },
      noRawSql: {
        message: 'Raw SQL detected. Use the project ORM instead.',
        suggestion: 'Use Drizzle/Prisma query builder (e.g., db.select().from(users).where(...))',
      },
      noHardcodedSecrets: {
        message: 'Hardcoded secret detected.',
        suggestion: 'Move to environment variable (.env) and access via process.env.VAR_NAME',
      },
      noConsoleLog: {
        message: 'Unexpected console.{method}() in non-test file.',
        suggestion: 'Remove or replace with a proper logging library.',
      },
      noEval: {
        message: 'eval() is a security risk and forbidden.',
        suggestion: 'Use proper parsers, JSON.parse, or dynamic imports instead.',
      },
      newFunction: {
        message: 'new Function() is essentially eval() and forbidden.',
        suggestion: 'Use proper function definitions or dynamic imports.',
      },
      maxFunctionLines: {
        message: 'Function exceeds {max} lines ({actual} lines).',
        suggestion: 'Refactor into smaller functions.',
      },
      maxComplexity: {
        message: 'Function "{name}" has complexity {actual} (max {max}).',
        suggestion: 'Reduce conditionals, extract helper functions.',
      },
      requireNullCheck: {
        message: 'Value from nullable operation assigned to `{name}` without null check.',
        suggestion: 'Add a null check before using {name}: if (!{name}) throw new Error(...)',
      },
      requireErrorHandling: {
        message: 'Async call without error handling.',
        suggestion: 'Wrap in try/catch or chain .catch(): await fn().catch(handleError)',
      },
      requireCsrfDecorator: {
        message: 'HTTP mutating route (POST/PUT/DELETE/PATCH) without CSRF protection.',
        suggestion: 'Add CSRF middleware: app.use(csrfProtection) and include x-csrf-token header.',
      },
      noTypeSuppressions: {
        message: 'Type error suppressions and empty catch blocks are forbidden.',
        suppressionMsg: 'Suppression `{pattern}` found without a reason comment.',
        emptyCatchMsg: 'Empty catch block — error is silently swallowed.',
        suggestion: 'Fix the actual error instead of suppressing it. If temporary, add a comment explaining why and create a tracking ticket.',
      },
    },
    tool: {
      checkFile: {
        name: 'constitution_check_file',
        description: 'Check a single file against Constitution rules. Detects language from file extension.',
        inputPath: 'File path (absolute or relative to cwd)',
      },
      checkProject: {
        name: 'constitution_check_project',
        description: 'Check multiple files in a project against the Constitution. Scans by glob pattern.',
        inputGlob: 'Glob pattern (default: src/**/*.{ts,tsx})',
        inputPaths: 'Explicit file paths',
        inputMaxFiles: 'Maximum files to check (default: 100)',
      },
      listRules: {
        name: 'constitution_list_rules',
        description: 'List all active Constitution rules grouped by language module.',
      },
      status: {
        name: 'constitution_status',
        description: 'Show Constitution server status: active modules, rules count, config.',
      },
    },
    module: {
      notFound: 'Module "{name}" not at {path}. Skipping.',
      loaded: 'Loaded module: {name} ({count} rules)',
      failed: 'Failed to load module "{name}": {error}',
      noModules: 'No language modules loaded',
      unknownLang: 'No language module for extension "{ext}"',
      langNotLoaded: 'Language "{lang}" detected but module not loaded. Add "{lang}" to .nocowboyrc',
    },
    check: {
      fileNotFound: 'File not found: {path}',
      empty: 'No files specified. Pass paths[] or set up .nocowboyrc with project scanning.',
      summary: 'Files checked: {checked}\nFiles with violations: {violated}\nTotal violations: {total}',
      truncated: ' (truncated to {max})',
      passed: 'All checks passed.',
      failed: 'Some checks failed.',
      ruleFailed: 'Rule {rule} failed on {file}: {error}',
    },
    violation: {
      format: '{symbol} [{rule}] {file}:{line}:{col} — {message}',
      summaryTitle: 'Constitution: {count} issues found',
      errorsLabel: '  {count} errors, {warnings} warnings',
      byRule: '\nBy rule:',
    },
  },
}

export default en
