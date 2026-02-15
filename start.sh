#!/bin/sh
set -e

echo "==> Waiting for database to be ready..."
MAX_RETRIES=15
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
    if python -c "
import os, sys

# Prefer internal URL (Render paid), fall back to external
url = os.environ.get('DATABASE_INTERNAL_URL', '').strip() or os.environ.get('DATABASE_URL', '').strip()
if not url:
    print('DATABASE_URL is not set or empty — database may still be provisioning')
    sys.exit(1)

# Show sanitized URL for debugging (mask password)
try:
    from urllib.parse import urlparse
    p = urlparse(url)
    safe = f'{p.scheme}://{p.username}:***@{p.hostname}:{p.port}{p.path}'
    print(f'Connecting to: {safe}')
except Exception:
    print('Connecting to DATABASE_URL (could not parse for display)')

# Normalize scheme for psycopg2
if url.startswith('postgres://'):
    url = url.replace('postgres://', 'postgresql://', 1)
elif url.startswith('postgresql+asyncpg://'):
    url = url.replace('postgresql+asyncpg://', 'postgresql://', 1)

import psycopg2
try:
    conn = psycopg2.connect(url, connect_timeout=5)
    conn.close()
    sys.exit(0)
except Exception as e:
    print(f'DB not ready: {e}')
    sys.exit(1)
" 2>&1; then
        echo "==> Database is ready"
        break
    fi
    RETRY=$((RETRY + 1))
    if [ $RETRY -ge $MAX_RETRIES ]; then
        echo "==> ERROR: Could not connect to database after $MAX_RETRIES attempts"
        echo "==> Check that DATABASE_URL is set and the database is provisioned"
        exit 1
    fi
    WAIT=$((RETRY * 2))
    echo "==> Retry $RETRY/$MAX_RETRIES in ${WAIT}s..."
    sleep $WAIT
done

echo "==> Running migrations..."
alembic upgrade head

echo "==> Starting server on port ${PORT:-8000}..."
exec gunicorn app.main:app \
    -w 2 \
    -k uvicorn.workers.UvicornWorker \
    --bind "0.0.0.0:${PORT:-8000}" \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
