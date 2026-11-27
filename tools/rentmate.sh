#!/usr/bin/env bash
set -euo pipefail

CMD="${1:-help}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

ensure_local_config() {
  if [ ! -f src/config/config.local.js ]; then
    cat > src/config/config.local.js <<'EOF'
import { ENV as BASE_ENV } from './env.example.js';

export const ENV = {
  ...BASE_ENV,
  firebase: {
    apiKey: 'demo-rentmate-api-key',
    authDomain: 'demo-rentmate.firebaseapp.com',
    projectId: 'demo-rentmate',
    storageBucket: 'demo-rentmate.firebasestorage.app',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:demo',
  },
  useEmulator: true,
  emulatorHost: '127.0.0.1',
  emulatorAuthPort: 9099,
  emulatorFirestorePort: 8081,
  debugQuota: true,
};
EOF
    echo "Created git-ignored src/config/config.local.js for local emulators."
  fi
}

case "$CMD" in
  start)
    ensure_local_config
    docker compose up -d --build
    echo ""
    echo "RentMate is running locally:"
    echo "  App:          http://localhost:8080/"
    echo "  Emulator UI:  http://localhost:4000/"
    echo "  Demo logins (password: rentmate123):"
    echo "    Owner:  owner@rentmate.test"
    echo "    Renter: renter@rentmate.test"
    echo "    Admin:  admin@rentmate.test"
    ;;
  stop)
    docker compose down
    ;;
  logs)
    docker compose logs -f
    ;;
  test)
    docker compose run --rm test
    ;;
  status)
    docker compose ps
    ;;
  *)
    echo "Usage: ./tools/rentmate.sh {start|stop|status|logs|test}"
    exit 1
    ;;
esac
