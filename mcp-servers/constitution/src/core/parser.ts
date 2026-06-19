// Generic tree-sitter wrapper.
// Currently returns null. When tree-sitter is integrated,
// this will load the appropriate grammar for a given language.
//
// import Parser from 'tree-sitter'
//
// export function parseFile(path: string, grammar: Parser): { tree: Tree; source: string } {
//   const source = readFileSync(path, 'utf-8')
//   const tree = grammar.parse(source)
//   return { tree, source }
// }

export function parseFile(): null {
  return null
}
