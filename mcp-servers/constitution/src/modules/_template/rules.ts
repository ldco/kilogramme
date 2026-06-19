// Template for a new Language Module.
// Copy this directory: cp -r src/modules/_template src/modules/<language>
// Then implement rules below.

import type { Rule } from '../../types.js'

export const moduleName = 'template'
export const extensions = ['.ext']

// Each rule file exports `rule: Rule` which gets re-exported here.
// Example:
//   import { rule as myRule } from './rules/my-rule.js'
//   export const rules = [myRule]

export const rules: Rule[] = []
