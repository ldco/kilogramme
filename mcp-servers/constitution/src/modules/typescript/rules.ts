export const moduleName = 'typescript'
export const extensions = ['.ts', '.tsx', '.mts', '.cts']

import { rule as noAnyType } from './rules/no-any-type.js'
import { rule as noRawSql } from './rules/no-raw-sql.js'
import { rule as noHardcodedSecrets } from './rules/no-hardcoded-secrets.js'
import { rule as noConsoleLog } from './rules/no-console-log.js'
import { rule as noEval } from './rules/no-eval.js'
import { rule as maxFunctionLines } from './rules/max-function-lines.js'
import { rule as maxComplexity } from './rules/max-complexity.js'
import { rule as requireNullCheck } from './rules/require-null-check.js'
import { rule as requireErrorHandling } from './rules/require-error-handling.js'
import { rule as requireCsrfDecorator } from './rules/require-csrf-decorator.js'
import { rule as noTypeSuppressions } from './rules/no-type-suppressions.js'

export const rules = [
  noAnyType,
  noRawSql,
  noHardcodedSecrets,
  noConsoleLog,
  noEval,
  maxFunctionLines,
  maxComplexity,
  requireNullCheck,
  requireErrorHandling,
  requireCsrfDecorator,
  noTypeSuppressions,
]
