#!/bin/sh
set -e

echo "==> Waiting for database to be ready..."
MAX_RETRIES=10
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
    if python -c "
import os, sys
try:
    import psycopg2
    url = os.environ.get('DATABASE_URL', '')
    if url.startswith('postgres://'):
        url = url.replace('postgres://', 'postgresql://', 1)
    conn = psycopg2.connect(url)
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
