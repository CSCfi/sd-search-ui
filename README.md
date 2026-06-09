# CSC Discovery

A federated digital pathology image search portal built on top of [BigPicture](https://bp.nbis.se). Researchers can search for pathology image datasets using structured filters and request access to relevant images via REMS.

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

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Search API base URL |
| `VITE_LOGIN_URL` | LifeScience AAI login redirect URL |
| `VITE_LOGOUT_URL` | Logout and session clear URL |
| `VITE_ACCOUNT_INFO` | Session check endpoint (200 = valid session) |

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
pnpm lint           # ESLint
pnpm format         # Prettier
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
- [BigPicture](https://bp.nbis.se) — source of pathology image metadata
- [REMS](https://bp-rems.sd.csc.fi) — access request management