#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Install Python dependencies
pip install -r "$CLAUDE_PROJECT_DIR/requirements.txt"

# Install dev tools (test runner + linter)
pip install pytest ruff

# Make the project importable
echo "export PYTHONPATH=\"$CLAUDE_PROJECT_DIR:\$PYTHONPATH\"" >> "$CLAUDE_ENV_FILE"
