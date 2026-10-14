#!/bin/sh
set -eu

: "${BACKEND_URL:?BACKEND_URL is required}"

# nginx.conf puts these URLs into proxy_pass. BACKEND_URL is used in a regex location, where
# proxy_pass cannot carry a URI part, so it must be scheme + host (+ port) only. DOD_URL is
# the DoD service base and may carry a path; nginx appends the method name to it.
fail() {
    echo "$1 must be $2, got: $3" >&2
    exit 1
}
check_url() {
    name=$1 value=$2 shape=$3 allow_path=$4
    case "$value" in
        http://*|https://*) ;;
        *) fail "$name" "$shape" "$value" ;;
    esac
    case "${value#*://}" in
        ''|*'?'*|*'#'*|*' '*|*/) fail "$name" "$shape" "$value" ;;
    esac
    if [ "$allow_path" = no ]; then
        case "${value#*://}" in
            */*) fail "$name" "$shape" "$value" ;;
        esac
    fi
}

check_url BACKEND_URL "$BACKEND_URL" "http(s)://host[:port] with no path or trailing slash" no

# DOD_URL is optional: only services with the Dataset on Demand flow need it. nginx cannot make
# proxy_pass conditional, so the /dod locations are rendered here and included by nginx.conf.
# conf.d is the writable directory; the .locations suffix keeps nginx.conf's `conf.d/*.conf`
# http-level include from loading it outside the server block.
DOD_LOCATIONS=/etc/nginx/conf.d/dod.locations
if [ -n "${DOD_URL:-}" ]; then
    check_url DOD_URL "$DOD_URL" "http(s)://host[:port][/path] with no trailing slash, query or fragment" yes
    # Only DOD_URL is substituted; $cookie_access_token and friends are nginx variables.
    envsubst '${DOD_URL}' < /etc/nginx/dod.locations.template > "$DOD_LOCATIONS"
else
    printf '# DOD_URL not set: Dataset on Demand disabled.\nlocation /dod { return 404; }\n' > "$DOD_LOCATIONS"
fi

exec /docker-entrypoint.sh "$@"
