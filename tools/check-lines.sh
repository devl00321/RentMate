#!/usr/bin/env bash
# Fails if any tracked text file exceeds the line cap (default 250).
# Usage: tools/check-lines.sh [max_lines] [root_dir]
set -euo pipefail

MAX="${1:-250}"
ROOT="${2:-.}"
fail=0

while IFS= read -r -d '' file; do
  lines=$(wc -l < "$file")
  if [ "$lines" -gt "$MAX" ]; then
    echo "TOO LONG ($lines > $MAX): $file"
    fail=1
  fi
done < <(find "$ROOT" -type f \
  \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.md' \
     -o -name '*.json' -o -name '*.rules' -o -name '*.sh' \) \
  -not -path '*/node_modules/*' -not -path '*/.git/*' \
  -not -name 'package-lock.json' -print0)

if [ "$fail" -eq 0 ]; then
  echo "OK: all files are within $MAX lines"
fi
exit "$fail"
