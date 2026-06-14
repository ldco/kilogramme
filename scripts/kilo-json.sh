#!/usr/bin/env bash
# kilo-json — Headless JSON wrapper for Kilo Code CLI
# Usage: kilo-json [--type code_change|quality_check|repomap] "your task"
# Output: parseable JSON to stdout, logs to stderr
#
# Examples:
#   kilo-json "run lint and typecheck"
#   kilo-json --type quality_check "audit all files"
#   kilo-json "list all TODO comments" | jq '.result.files'

set -euo pipefail

TYPE=""
ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --type) TYPE="$2"; shift 2 ;;
    *) ARGS+=("$1"); shift ;;
  esac
done

PROMPT="${ARGS[*]:-}"
if [[ -z "$PROMPT" ]]; then
  echo '{"ok":false,"action":"invalid_input","result":{},"stats":{},"errors":[{"code":"NO_PROMPT","message":"No task provided. Usage: kilo-json \"your task\""}]}' >&2
  exit 1
fi

TYPE_HINT=""
if [[ -n "$TYPE" ]]; then
  TYPE_HINT=" Action type: $TYPE."
fi

# Run Kilo in autonomous mode with /json prefix
# All logs go to stderr, JSON output to stdout
OUTPUT_FILE="$(mktemp /tmp/kilo-json-output.XXXXXX)"
trap 'rm -f "$OUTPUT_FILE"' EXIT

kilo run --auto "/json ${PROMPT}.${TYPE_HINT} Output ONLY valid JSON. No other text." >"$OUTPUT_FILE" 2>&2 || {
  EXIT_CODE=$?
  echo "{\"ok\":false,\"action\":\"kilo_error\",\"result\":{},\"stats\":{},\"errors\":[{\"code\":\"EXIT_${EXIT_CODE}\",\"message\":\"Kilo exited with code ${EXIT_CODE}\"}]}"
  exit $EXIT_CODE
}

# Extract JSON from the output (may be wrapped in markdown code fence)
cat "$OUTPUT_FILE" | python3 -c "
import sys, json, re
text = sys.stdin.read()

# Try to extract JSON from markdown code fence
match = re.search(r'\`\`\`(?:json)?\s*\n(.*?)\n\`\`\`', text, re.DOTALL)
if match:
    text = match.group(1)

# Try to parse and pretty-print
try:
    obj = json.loads(text.strip())
    print(json.dumps(obj, indent=2, ensure_ascii=False))
except json.JSONDecodeError:
    # Raw text — wrap as error
    print(json.dumps({
        'ok': False,
        'action': 'parse_error',
        'result': {},
        'stats': {},
        'errors': [{'code': 'PARSE_ERROR', 'message': text.strip()[:200]}]
    }, indent=2, ensure_ascii=False))
"
