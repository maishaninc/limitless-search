#!/bin/sh
set -eu

backend_port="${PORT:-8888}"
web_port="${WEB_PORT:-3200}"
api_base="${NEXT_PUBLIC_API_BASE:-http://127.0.0.1:${backend_port}}"

/app/pansou &
backend_pid=$!

cd /app/web
NEXT_PUBLIC_API_BASE="$api_base" PORT="$web_port" HOSTNAME="${HOSTNAME:-0.0.0.0}" node bootstrap.js &
web_pid=$!

shutdown() {
  kill -TERM "$web_pid" "$backend_pid" 2>/dev/null || true
  wait "$web_pid" 2>/dev/null || true
  wait "$backend_pid" 2>/dev/null || true
}

trap 'shutdown; exit 0' INT TERM

while true; do
  if ! kill -0 "$backend_pid" 2>/dev/null; then
    if wait "$backend_pid"; then
      backend_status=0
    else
      backend_status=$?
    fi
    kill -TERM "$web_pid" 2>/dev/null || true
    wait "$web_pid" 2>/dev/null || true
    exit "$backend_status"
  fi

  if ! kill -0 "$web_pid" 2>/dev/null; then
    if wait "$web_pid"; then
      web_status=0
    else
      web_status=$?
    fi
    kill -TERM "$backend_pid" 2>/dev/null || true
    wait "$backend_pid" 2>/dev/null || true
    exit "$web_status"
  fi

  sleep 1
done
