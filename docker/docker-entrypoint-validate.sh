#!/bin/sh
set -eu

: "${BACKEND_URL:?BACKEND_URL is required}"

exec /entrypoint.sh "$@"