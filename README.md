# sd-search-ui

A multi-service search UI framework for Beacon V2-compatible backends. Currently deployed as
[BigPicture Discovery](https://bp.nbis.se) — a federated digital pathology image search portal
where researchers find whole-slide image datasets and request access via [REMS](https://github.com/CSCfi/rems/).

One codebase, one deploy per service. Service identity is fixed at build time via `VITE_SERVICE`.

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
# Edit VITE_SERVICE to select which service to run (default: bigpicture)
pnpm dev
```

The dev server proxies `/api`, `/login`, `/logout`, and `/callback` to `http://localhost:8000`. A running backend is required for the search and auth flows to work. See the [Search API](https://github.com/CSCfi/sd-search-api) repo for backend setup.

## Environment Variables

| Variable | Required | Description |
|---|---:|---|
| `VITE_SERVICE` | yes | Service identity — selects router, views, config, and theme at build time. Default: `bigpicture` |
| `VITE_AUTH_BYPASS` | no | `"true"` bypasses the route auth guard for local development |
| `VITE_REMS_URL` | yes | REMS base URL — set per environment (test/prod). Used to build access request links |
| `VITE_DOD_ENDPOINT_URL` | yes* | Dataset-on-Demand (DoD) submission endpoint URL. Used by `useDatasetOnDemand` to create a virtual dataset from matching non-clinical image IDs, poll for its release, then open REMS. Set per environment; leave empty to disable the DoD flow |
| `BACKEND_URL` | runtime | nginx proxy target for `/api/`, `/login`, `/callback`, `/logout` — see [Runtime container environment](#runtime-container-environment) |

## Project Structure

```
config/
    groups.yaml         # Filter group structure — shared default across services
    <service>/
        content.ts      # Shared-component text (footer links, help content, etc.)
        fields.yaml     # Field and scope visibility configuration (per-service)
        groups.yaml     # Optional override — copy from root only when structure diverges
        meta.json       # Build-time metadata (app title)
        theme.scss      # CSS custom properties for colors and fonts
src/
    assets/
        <service>/      # Service-specific assets (logo, favicon)
        images/         # Shared assets (login button icon, etc.)
        fonts/          # Font files
        styles/         # Global SCSS (variables, base styles, fonts)
    components/
        AppFooter.vue       # Shared footer (content via useContentConfig)
        AppNavbar.vue       # Shared navbar with service logo
        DescriptionModal.vue # Modal for expanded dataset descriptions
        HelpSidebar.vue     # Help sidebar (content via useContentConfig)
        ResultsBanner.vue   # Banner shown above search results
        SearchForm.vue      # Shared search form — scope tabs + filter grid
        <service>/          # Service-specific components (e.g. bigpicture/ResultsTable.vue)
        dynamic/            # Schema-driven field components (DynamicField + one per FilteringTerm.type)
        filters/            # Scope tabs, observation type selector, scope badge
        ui/                 # Generic shared components (Badge, ErrorBanner, LoadingSpinner, etc.)
    composables/
        query/          # TanStack Query composables (search, field values, suggestions, status, groups)
        ui/             # UI composables (content config, field scopes, cookie consent, keyboard nav, etc.)
    directives/         # vControl — v-model bridge for c-* web components
    plugins/            # Cookie consent
    router/
        <service>.ts    # Service-specific router — landing page and route definitions
    services/
        api.ts          # All API functions (getFilteringTerms, postQuery, submitDatasetOnDemand, etc.)
        apiClient.ts    # Axios instance with auth interceptor
        config.ts       # Typed exports of fields.yaml and groups.yaml via @service/ alias
    stores/             # Pinia: searchStore, authStore
    types/
        beacon.ts       # Beacon V2 protocol types (filtering terms, query, responses)
        config.ts       # FilteringGroup, ResolvedGroup — types for groups.yaml at config and runtime
        content.ts      # ContentConfig interface — contract for config/<service>/content.ts
        <service>.ts    # Service-specific result types (e.g. bigpicture.ts)
    utils/              # Small shared helpers
    views/
        <service>/      # Service-specific page views (HomePage, SearchPage, etc.)
        shared/         # Views shared across services (NotFoundPage, etc.)
```

## Adding a New Service

1. **Create config files** — copy `config/bigpicture/` to `config/<service>/` and edit each file:
   - `meta.json` — set `appTitle`
   - `content.ts` — update footer links, contact email, help text, logo import
   - `fields.yaml` — adjust field/scope visibility for your backend's fields
   - `theme.scss` — define CSS custom properties for your brand
   - `groups.yaml` — only if your service needs a different group structure; otherwise the shared `config/groups.yaml` is used automatically

2. **Add assets** — create `src/assets/<service>/` with `favicon.ico` and a logo image.

3. **Add a router** — create `src/router/<service>.ts`. Copy `src/router/bigpicture.ts` as a starting point and adjust routes and views.

4. **Add views** — create `src/views/<service>/`. Copy from `src/views/bigpicture/` as a starting point, then edit or replace views as needed.

5. **Add service-specific components** (if needed) — create `src/components/<service>/`. Copy components from `src/components/bigpicture/` as a starting point. Service-specific components must not be imported from shared components.

6. **Add service-specific types** (if needed) — create `src/types/<service>.ts` for result shapes that differ from standard Beacon V2.

7. **Set `VITE_SERVICE=<service>`** in `.env` and run `pnpm dev`.

### What not to touch

Shared components (`components/dynamic/`, `components/filters/`, `components/ui/`, `SearchForm.vue`, `HelpSidebar.vue`, etc.) must not contain service-specific branching. If a shared component needs to vary per service, use slots or props — or give the service its own copy under `components/<service>/`.

## Configuration Reference

### `config/<service>/fields.yaml`

Controls which fields and groups are visible in the search form. Bundled at build time — restart `pnpm dev` or rebuild after changes.

| Field | Type | Notes |
|---|---|---|
| `header` | `string[]` | Field ids rendered in the header slot above the filter tabs (e.g. `observation_type`) |
| `hidden` | `string[]` | Field ids to hide entirely. Groups with all fields hidden are hidden automatically |
| `hidden_description` | `string[]` | Field ids whose info tooltip is suppressed. Field still shows — only the (i) icon is hidden |
| `hidden_scopes` | `string[]` | Scope ids to hide entirely. The scope's tab and all its fields are removed from the UI. When only one scope remains visible, the "All data" tab is also hidden and searches are automatically scoped. When all scopes are hidden, the entire tab group (including the observation type selector) is hidden |
| `show_concept_id` | `string[]` | Field ids for which the ontology concept ID is shown in parentheses next to the term label in the dropdown. Only applies when a non-null `concept_id` is returned by the backend |
| `bordered` | `string[]` | Group and scope ids to render with a bordered box |

### `config/groups.yaml` (and optional `config/<service>/groups.yaml`)

Defines which filter fields belong to which UI groups, in what order they render, and which groups are subgroups of another.

`config/groups.yaml` is the shared default used by all services. A service that needs a different structure creates `config/<service>/groups.yaml` — the build resolver picks it up automatically with no code change required.

A field absent from `groups.yaml` is silently dropped from the UI. Keep it in sync with the backend's `/filtering_terms` field list.

```yaml
- id: <group-id>
  label: "Group label"
  parent: <parent-group-id>   # optional — omit for root groups
  fields:
    - field_id_1              # field ids in render order
    - field_id_2
```

- Groups without `parent` render as flat sections in their scope panel.
- Groups with `parent` render as labelled subgroups inside the parent group.
- Group order in the file is the render order; field order within each group is also yaml-defined.

Group resolution at runtime is handled by the `useResolvedGroups` composable (`composables/query/useResolvedGroups.ts`), which merges `groups.yaml` with the backend's `/filtering_terms` response.

### `config/<service>/content.ts`

Text and links for shared components: footer links, contact email, cookie consent text, help sidebar content, and the navbar logo. Read via `useContentConfig()` composable — shared components never hardcode service content.

### `config/<service>/theme.scss`

CSS custom properties for colors and fonts. Replaces `src/assets/styles/_variables.scss` per service. Edit directly and rebuild.

### `config/<service>/meta.json`

Plain JSON read by `vite.config.ts` at Node.js time. Currently only `appTitle` (browser tab title).

## Docker

### Dockerfile

Multi-stage build:

1. **build** (`node:26-alpine`) — installs dependencies and runs `pnpm build`. Pass `VITE_SERVICE` as a build arg to select the service.
2. **serve** (`nginx:1.31-alpine`) — copies `dist/` into nginx. Runs as an arbitrary UID in the root group (OpenShift compatible), listens on port **8081**.

`nginx.conf` adds SPA fallback (`try_files … /index.html`), aggressive caching for Vite's content-hashed assets, and no-cache on `index.html`.

API and auth routes (`/api/`, `/login`, `/callback`, `/logout`) are always called on this app's own origin — nginx proxies them to the backend. The backend's OIDC `/callback` sets a host-only session cookie scoped to this origin; cross-origin calls would break auth.

### Building for deployment

```bash
docker build --platform=linux/amd64 \
  --build-arg VITE_SERVICE=bigpicture \
  -f docker/Dockerfile \
  -t <image-registry-url>/sd-search-ui:latest .

docker push <image-registry-url>/sd-search-ui:latest
```

### Continuous deployment

Merging a PR to `main` automatically builds and pushes the image to Rahti via `.github/workflows/ci.yml`. Direct pushes to `main` are not allowed — use a PR. Once pushed under `:latest`, Rahti's ImageStream triggers the rollout automatically. The manual build/push steps above are only needed for out-of-band builds.

### Running with docker-compose

```bash
cp .env.example .env
# Set BACKEND_URL if the default doesn't reach your backend

docker compose up --build
```

The app is served at `http://localhost:8081`.

### Runtime container environment

| Variable | Required | Description |
|---|---:|---|
| `BACKEND_URL` | yes | Base URL the nginx proxy forwards `/api/`, `/login`, `/callback`, `/logout` to |

If `BACKEND_URL` is missing, the container fails fast at startup (`docker/docker-entrypoint-validate.sh`) rather than starting with a broken config.

Example:

```bash
docker run --rm -p 8081:8081 \
  -e BACKEND_URL=http://host.docker.internal:8000 \
  sd-search-ui
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

### JetBrains (Rider / WebStorm)

Install the [Web Components Language Server](https://plugins.jetbrains.com/plugin/18322-web-components-language-server) plugin for CSC UI component autocomplete.

Generate the Custom Elements Manifest:

```bash
python3 scripts/convert-cem.py
```

Creates `custom-elements.json` in the project root (gitignored). Re-run after updating `@cscfi/csc-ui`.

### VS Code

```json
{
  "html.customData": ["node_modules/@cscfi/csc-ui/vscode-data.json"]
}
```

## Related

- [Search API](https://github.com/CSCfi/sd-search-api) — FastAPI backend
- [BigPicture / NBIS](https://bp.nbis.se) — data source for the BigPicture service
- [REMS](https://bp-rems.sd.csc.fi) — access request management system
- [Dataset landing pages](https://datasets.bigpicture.eu/index.html) — public landing pages linked from search results
