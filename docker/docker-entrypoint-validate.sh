#!/bin/sh
set -eu

: "${BACKEND_URL:?BACKEND_URL is required}"

# nginx.conf uses BACKEND_URL in a regex location, where proxy_pass cannot
# carry a URI part — so it must be scheme + host (+ port) only.
fail() {
    echo "BACKEND_URL must be http(s)://host[:port] with no path or trailing slash, got: $BACKEND_URL" >&2
    exit 1
}
case "$BACKEND_URL" in
    http://*|https://*) ;;
    *) fail ;;
esac
case "${BACKEND_URL#*://}" in
    ''|*/*|*'?'*|*'#'*|*' '*) fail ;;
esac

exec /docker-entrypoint.sh "$@"