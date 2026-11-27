#!/usr/bin/env bash
set -euo pipefail

mkdir -p /data
IMPORT_ARGS=""
if [ -f /data/firebase-export-metadata.json ]; then
  IMPORT_ARGS="--import=/data"
fi

firebase emulators:start \
  --only auth,firestore \
  --project demo-rentmate \
  $IMPORT_ARGS \
  --export-on-exit=/data &
EMU_PID=$!

cleanup() {
  kill -TERM "$EMU_PID" 2>/dev/null || true
  wait "$EMU_PID" 2>/dev/null || true
}
trap cleanup TERM INT

for i in $(seq 1 40); do
  if ! kill -0 "$EMU_PID" 2>/dev/null; then
    echo "Emulator process exited unexpectedly"
    wait "$EMU_PID"
    exit 1
  fi
  if curl -sf http://127.0.0.1:9099/ >/dev/null && curl -sf http://127.0.0.1:8081/ >/dev/null; then
    break
  fi
  sleep 1
done

node /app/tools/seed-emulator.mjs || echo "Warning: emulator seed skipped"

wait "$EMU_PID"
