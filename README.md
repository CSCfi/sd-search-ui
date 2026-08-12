# CSC Discovery

A federated digital pathology image search portal built on top of [Bigpicture](https://bp.nbis.se). Researchers can search for pathology image datasets using structured filters and then request access via [REMS](https://github.com/CSCfi/rems/).

## Tech Stack

- Vue 3 + TypeScript + Vite
- Pinia — state management
- TanStack Vue Query — server state and caching
- Vue Router
- CSC UI (`@cscfi/csc-ui`) — web component library
- Vitest — unit and component tests

## Prerequisites

- Node.js 20+
- pnpm 9+

## Getting Started

```bash
pnpm install
cp .env.example .env
# Fill in the required environment variables in .env
pnpm dev
```

## Docker

### Dockerfile

Multi-stage build:

1. **build** (`node:26-alpine`) — installs dependencies with pnpm and runs `pnpm build`.
2. **serve** (`nginx:1.31-alpine`) — copies the built `dist/` into nginx. Configured for Rahti/OpenShift: the nginx process runs as an arbitrary UID in the root group (no fixed user), and listens on port **8081** (non-root cannot bind ports below 1024).

`nginx.conf` adds SPA fallback (`try_files … /index.html`), aggressive caching for Vite's content-hashed assets, and no-cache on `index.html` itself.

The API base URL and the login/logout URLs are not configurable — the app always calls `/api`, `/login`,
and `/logout` on its own origin, and relies on nginx (below) to proxy those through to the real backend.
This isn't a placeholder default; it's the only origin that works, because the backend's OIDC `/callback`
sets a host-only session cookie that must be set on this same origin to reach later `/api/` calls.

### Building for deployment

```bash
docker build --platform=linux/amd64 \
  -f docker/Dockerfile \
  -t <image-registry-url>/sd-search-ui:latest .

docker push <image-registry-url>/sd-search-ui:latest
```

Pushing under the `sd-search-ui:latest` tag is enough to deploy when 
OpenShift's ImageStream triggering rollout automatically.


### Running with docker-compose

```bash
cp .env.example .env
# Fill in BACKEND_URL if the default doesn't reach your backend

docker compose up --build
```

The app is served at `http://localhost:8081`.

### Runtime container environment

Unlike the API base/login/logout URLs above, the nginx proxy *target* — where `/api/`, `/login`,
`/callback`, `/logout` actually get forwarded to — is runtime configuration, not baked into the image.
The official `nginx:1.31-alpine` image renders `nginx.conf` from `/etc/nginx/templates/default.conf.template`
using environment variables before nginx starts.

| Variable | Required | Description |
|---|---:|---|
| `BACKEND_URL` | yes | Base URL for the backend proxied from `/api/`, `/login`, `/callback`, `/logout` |

`BACKEND_URL` is referenced in `nginx.conf`:

```nginx
location /api/ {
    proxy_pass ${BACKEND_URL}/;
}
```

`/login`, `/callback`, and `/logout` are proxied the same way, unprefixed.

Example:

```bash
docker run --rm -p 8081:8081 \
  -e BACKEND_URL=http://host.docker.internal:8000 \
  sd-search-ui
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_AUTH_BYPASS` | Bypass the router's auth guard, for local development |
| `BACKEND_URL` | Runtime nginx proxy target for `/api/`, `/login`, `/callback`, `/logout` — see [Runtime container environment](#runtime-container-environment) |

## Project Structure

```
src/
  assets/
    fonts/          # Lato font files (.ttf)
    styles/         # SCSS — variables, base styles, fonts
  components/
    dynamic/        # Schema-driven field components
    ui/             # Shared UI components
  composables/      # TanStack Query composables
  directives/       # vControl — v-model bridge for CSC UI components
  router/           # Vue Router + auth guards
  services/         # API layer
  stores/           # Pinia stores
  types/            # TypeScript types
  views/            # Page-level components
```

## Commands

```bash
pnpm dev            # Start dev server
pnpm build          # Production build
pnpm type-check     # TypeScript check
pnpm test           # Run tests
pnpm test:watch     # Run tests in watch mode
pnpm lint           # Run all linters
pnpm lint:oxlint    # Run OXLint
pnpm lint:eslint    # Run ESLint
pnpm lint:ci        # Run linters in CI mode
pnpm lint:oxlint:ci # Run OXLint in CI mode
pnpm lint:eslint:ci # Run ESLint in CI mode
pnpm format         # Format code with Prettier
pnpm format:ci      # Check code format with Prettier in CI mode
```

## IDE Setup

To show CSC UI components in autocomplete and get prop type hints, set up the IDE as follows.

### JetBrains (Rider / WebStorm)

Install the [Web Components Language Server](https://plugins.jetbrains.com/plugin/18322-web-components-language-server) plugin for component autocomplete.

Generate the Custom Elements Manifest from CSC UI's component definitions:

```bash
python3 scripts/convert-cem.py
```

This creates `custom-elements.json` in the project root which the plugin picks up automatically.
The file is gitignored — run the script once after `pnpm install`. You need to re-run the script after updating `@cscfi/csc-ui` to get new components in autocomplete.

### VS Code

The CSC UI component definitions are available via HTML custom data.
Add to `.vscode/settings.json`:

```json
{
  "html.customData": ["node_modules/@cscfi/csc-ui/vscode-data.json"]
}
```

## Related

- [Search API](https://github.com/CSCfi/sd-search-api) — FastAPI backend
- [Bigpicture submitter guide (NBIS)](https://bp.nbis.se) —  The contributors submit data + metadata to NBIS. 
- [REMS](https://bp-rems.sd.csc.fi) — access request management system, where the link from Discovery UI leads
- [Landing pages](https://datasets.bigpicture.eu/index.html) - the public landing pages, where Discovery UI need to link the datasets in output
