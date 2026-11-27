#!/usr/bin/env bash
set -euo pipefail

echo "=== Checking .gitignore coverage ==="
for path in src/config/config.local.js .env .firebaserc serviceAccountKey.json secret.pem; do
  if ! git check-ignore -q "$path"; then
    echo "FAIL: $path is NOT ignored by .gitignore"
    exit 1
  fi
done

echo "=== Checking tracked files for leaked secrets ==="
if git grep -nE "AIza[0-9A-Za-z_-]{15,}|rzp_(test|live)_[0-9A-Za-z]{8,}|-----BEGIN .*PRIVATE KEY-----|cloudinary://[0-9]+:[A-Za-z0-9_-]+@" ; then
  echo "FAIL: potential secret or credential detected in tracked files"
  exit 1
fi

echo "OK: secrets & gitignore checks passed"
