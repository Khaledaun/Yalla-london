#!/usr/bin/env bash
# Claude Code SessionStart hook
# Displays git context and project health on session start
# Reads stdin JSON: {session_id, cwd}
# Output to stderr is displayed to the user

set -euo pipefail

# Read stdin but don't fail if empty
CWD=$(cat | jq -r '.cwd // empty' 2>/dev/null || true)
cd "${CWD:-/home/user/Yalla-london}" 2>/dev/null || cd /home/user/Yalla-london

echo "" >&2
echo "=== Session Context ===" >&2

# Git state
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
CHANGES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
LAST_COMMIT=$(git log --oneline -1 2>/dev/null || echo "no commits")
echo "Branch: $BRANCH | Uncommitted: $CHANGES" >&2
echo "Last commit: $LAST_COMMIT" >&2

# Show PROJECT_STATUS.md quick links if it exists
if [ -f PROJECT_STATUS.md ]; then
  echo "" >&2
  echo "--- Project Status ---" >&2
  # Show Last Session and Health Checks sections
  sed -n '/^## Last Session/,/^## [^L]/p' PROJECT_STATUS.md | head -6 | tail -5 >&2 2>/dev/null || true
fi

echo "=======================" >&2
echo "" >&2

exit 0
