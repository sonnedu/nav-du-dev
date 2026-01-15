#!/bin/sh
set -e

# Define ports
PAGES_PORT=${NAV_PAGES_PORT:-8799}
FAVICON_PORT=${NAV_FAVICON_PORT:-8787}

# Default Credentials (admin / admin)
DEFAULT_USER="admin"
# SHA256 for "admin"
DEFAULT_PASS_HASH="8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"
DEFAULT_SECRET="docker_dev_default_secret_nav_du_2026"

# Apply defaults if env vars are missing
ADMIN_USERNAME=${ADMIN_USERNAME:-$DEFAULT_USER}
ADMIN_PASSWORD_SHA256=${ADMIN_PASSWORD_SHA256:-$DEFAULT_PASS_HASH}
SESSION_SECRET=${SESSION_SECRET:-$DEFAULT_SECRET}

echo "🚀 Starting Nav-Du in Docker..."
echo "👤 Admin User: ${ADMIN_USERNAME}"

if [ "${ADMIN_PASSWORD_SHA256}" = "${DEFAULT_PASS_HASH}" ]; then
  echo "🔑 Password: (Default: admin)"
else
  echo "🔑 Password: (Custom configured)"
fi

# 1. Setup Environment Variables for Cloudflare Pages (Simulated)
# Wrangler reads .dev.vars for local development bindings
echo "📝 Generating .dev.vars from environment variables..."
cat > .dev.vars <<EOF
ADMIN_USERNAME=${ADMIN_USERNAME}
ADMIN_PASSWORD_SHA256=${ADMIN_PASSWORD_SHA256}
SESSION_SECRET=${SESSION_SECRET}
SESSION_TTL_SECONDS=${SESSION_TTL_SECONDS}
LOGIN_RATE_LIMIT_WINDOW_SECONDS=${LOGIN_RATE_LIMIT_WINDOW_SECONDS}
LOGIN_RATE_LIMIT_MAX_FAILS=${LOGIN_RATE_LIMIT_MAX_FAILS}
LOGIN_RATE_LIMIT_LOCK_SECONDS=${LOGIN_RATE_LIMIT_LOCK_SECONDS}
VITE_FAVICON_PROXY_BASE=http://127.0.0.1:${FAVICON_PORT}/ico
EOF

# Optional: Add any extra vars starting with VITE_
env | grep "^VITE_" >> .dev.vars || true

# 2. Start Favicon Worker (Background)
echo "🖼️ Starting Favicon Worker on port ${FAVICON_PORT}..."
npx wrangler dev \
  --config workers/favicon/wrangler.toml \
  --ip 0.0.0.0 \
  --port ${FAVICON_PORT} \
  --log-level error &
FAVICON_PID=$!

# Wait for Favicon worker to be ready (naive check)
sleep 2

# 3. Start Pages App (Foreground)
# We use 'dist' as the directory since we built it in the Dockerfile
echo "🧭 Starting Main App on port ${PAGES_PORT}..."
exec npx wrangler pages dev dist \
  --ip 0.0.0.0 \
  --port ${PAGES_PORT} \
  --kv NAV_CONFIG_KV \
  --persist-to /data/state \
  --log-level log
