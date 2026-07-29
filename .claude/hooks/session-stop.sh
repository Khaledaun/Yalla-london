#!/usr/bin/env bash
# Claude Code Stop hook — session summary logger + git state check
# Reads stdin JSON: {session_id, stop_hook_active}

set -uo pipefail

cd /home/user/Yalla-london 2>/dev/null || exit 0

# Read stdin
INPUT=$(cat 2>/dev/null || echo "{}")
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"' 2>/dev/null || echo "unknown")

TIMESTAMP=$(date '+%Y-%m-%d_%H-%M')
LOG_DIR=".claude/logs/sessions"
mkdir -p "$LOG_DIR"

# Git state
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
DIFF_STAT=$(git diff --stat HEAD 2>/dev/null || echo "no changes")
CHANGES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

# Write session log
cat > "$LOG_DIR/${TIMESTAMP}.md" << LOGEOF
# Session Log: $TIMESTAMP
- **Session ID:** $SESSION_ID
- **Branch:** $BRANCH
- **Uncommitted changes:** $CHANGES

## Changes
\`\`\`
$DIFF_STAT
\`\`\`
LOGEOF

# Update PROJECT_STATUS.md "Last Session" section if it exists
if [ -f PROJECT_STATUS.md ]; then
  # Use sed to update the Last Session block
  sed -i "s/^- Date: .*/- Date: $(date '+%Y-%m-%d %H:%M UTC')/" PROJECT_STATUS.md 2>/dev/null || true
  sed -i "s/^- Branch: .*/- Branch: $BRANCH/" PROJECT_STATUS.md 2>/dev/null || true
  sed -i "s/^- Files changed: .*/- Files changed: $CHANGES files/" PROJECT_STATUS.md 2>/dev/null || true
fi

# Warn about uncommitted changes
if [ "$CHANGES" -gt 0 ]; then
  echo "WARNING: $CHANGES uncommitted changes on branch $BRANCH" >&2
fi

exit 0
