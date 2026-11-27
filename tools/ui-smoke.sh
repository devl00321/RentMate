#!/usr/bin/env bash
set -euo pipefail

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE="http://localhost:8080"
ROUTES=("" "#/search?sample=1" "#/search?sample=1&q=doesnotmatch" "#/demo" "#/auth" "#/dashboard" "#/admin" "#/missing")

echo "=== Running UI smoke checks across routes at 360x800, 768x900, 1280x800 ==="
for width in 360 768 1280; do
  height=800
  [ "$width" = "768" ] && height=900
  for r in "${ROUTES[@]}"; do
    url="${BASE}/${r}"
    out="$("$CHROME" --headless --disable-gpu --window-size="${width},${height}" --virtual-time-budget=2500 --dump-dom "$url" 2>/dev/null)"
    if ! echo "$out" | grep -q "skip-link"; then
      echo "FAIL: missing skip-link on $url at ${width}px"
      exit 1
    fi
    if ! echo "$out" | grep -q "<h1"; then
      echo "FAIL: missing h1 on $url at ${width}px"
      exit 1
    fi
  done
  echo "OK: ${#ROUTES[@]} routes verified at ${width}px"
done
echo "UI_SMOKE_PASS"
