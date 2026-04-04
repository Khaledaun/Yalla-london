#!/usr/bin/env bash
# Claude Code PostToolUse hook — auto-format on Write|Edit
# Reads stdin JSON: {tool_name, tool_input, tool_output}
# Runs prettier on .ts/.tsx/.css/.json files in yalla_london/app/

set -uo pipefail

# Extract file path from stdin JSON
INPUT=$(cat 2>/dev/null || echo "{}")
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty' 2>/dev/null || true)

# Exit silently if no file path
[ -z "$FILE_PATH" ] && exit 0

# Only format files in yalla_london/app/ directory with supported extensions
case "$FILE_PATH" in
  */yalla_london/app/*.ts|*/yalla_london/app/*.tsx|*/yalla_london/app/*.css|*/yalla_london/app/*.json)
    # Skip node_modules, .next, generated, migrations
    case "$FILE_PATH" in
      */node_modules/*|*/.next/*|*/generated/*|*/prisma/migrations/*) exit 0 ;;
    esac

    # Run prettier if available
    PRETTIER="/home/user/Yalla-london/yalla_london/app/node_modules/.bin/prettier"
    if [ -x "$PRETTIER" ]; then
      "$PRETTIER" --write "$FILE_PATH" >/dev/null 2>&1 || true
    fi
    ;;
esac

exit 0
