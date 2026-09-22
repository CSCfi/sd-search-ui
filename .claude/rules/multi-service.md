---
description: Multi-service architecture — how services are built, deployed, and configured (router, views/components, fields.yaml, theme, content). Read when adding a new service or working on service-specific configuration.
alwaysApply: false
---

# Multi-Service Architecture for sd-search-ui

## Purpose

sd-search-ui is a generic codebase that serves multiple deployed services, each with its own configuration. This document defines how a service is added, built, and deployed from this shared repository without duplicating the codebase per service.

The core principle: one codebase, one deploy per service, build-time configuration selects which service-specific code and configuration is bundled into each build.

## Deployment model

Each service is built and deployed independently. There is no runtime service switching within a single running instance; the service identity is fixed at build time.

A single environment variable (for example `VITE_SERVICE`) determines which service is being built. Locally, developers keep one `.env` file and change its value to build or run against a different service. In CI/CD, the pipeline sets this variable per deploy target before running the build. No separate `.env.<service>` files are required at this stage; a single variable value is sufficient.

Any change to the codebase, whether shared or service-specific, triggers a new build and deploy for every affected service.

## Build-time aliases

Two Vite aliases resolve service-specific code at build time. Both are configured in `vite.config.ts` and invisible to the TypeScript compiler — they are pure Vite/Rollup resolution hooks.

### `@service/<path>`

A custom `service-alias` plugin resolves `@service/<path>` imports:

1. Checks `config/<service>/<path>` first (service-specific override).
2. Falls back to `config/<path>` (shared root — used for `groups.yaml` when no service override exists).

Extensions tried in order when `<path>` has no extension: `.ts`, `.js`, `.scss`, `.css`. For exact-extension imports (e.g. `@service/groups.yaml`), only the fallback to the shared root is attempted — extension-less probing is skipped.

All config imports in `src/services/config.ts` use this alias:

```ts
import fieldsConfigRaw from '@service/fields.yaml'   // always config/<service>/fields.yaml
import groupsConfigRaw from '@service/groups.yaml'   // config/<service>/groups.yaml if it exists, else config/groups.yaml
```

### `@service-router`

A plain `resolve.alias` entry maps `@service-router` directly to `src/router/<service>.ts`. Used in `searchStore.ts` to import the active router without hardcoding a service name.

## Router

Each service has its own router file (for example `router/bigpicture.ts`, `router/<other-service>.ts`). The router determines which view acts as the landing page and which routes exist for that service; services are not required to expose the same set of routes.

The router file is selected via the `@service-router` alias — it is the single point where a service's available views and navigation structure are defined.

## Views and components

Each service gets its own subfolder under `views/` and, where needed, under `components/` (for example `views/bigpicture/SearchView.vue`, `components/bigpicture/...`). This keeps a service's entire UI surface grouped together and scales better than a flat structure as more services and views are added.

**Starting point for a new service:** `views/bigpicture/` and `components/bigpicture/` contain the reference implementation. Copy them to `views/<service>/` and `components/<service>/` and edit from there — there is no requirement to build from scratch. The same applies to `router/bigpicture.ts` as the starting point for a new router file.

Shared components (current examples: `SearchForm.vue`, `HelpSidebar.vue`, and generic UI components under `components/ui/` such as `ToggleSwitch.vue`) remain untouched when building a service-specific variant. A shared component must not contain service- or environment-conditional branching internally (no `if (service === 'bigpicture')` logic inside a shared component).

Where a service needs to extend a shared component's behavior, the shared component may expose slots or props as generic extension points. The content filling that extension point comes from the service-specific view or wrapper component, not from conditional logic inside the shared component itself.

If a service needs a variant of a shared component that differs enough that slots or props do not cover it, the service gets its own full copy of that component under its own component subfolder, rather than the shared component being modified to special-case that service. Some duplication across services is an accepted tradeoff for keeping the shared codebase predictable and free of service-specific branching.

## fields.yaml (UI configuration)

The existing `fields.yaml` (hidden fields, hidden field descriptions, hidden scopes, bordered groups/scopes) becomes a separate file per service rather than one shared file. Each service has its own complete file (for example `config/bigpicture/fields.yaml`, `config/<other-service>/fields.yaml`), and the build-time environment variable selects which one is loaded.

This is not a shared file filtered by a per-service allowlist; each service owns its file outright. The backend continues to serve all fields for a given scope regardless of which frontend service is querying it; the frontend's fields.yaml controls only what that service's UI shows, independent of any other service.

Supported keys:

| Key | Type | Effect |
|---|---|---|
| `header` | `string[]` | Field ids rendered above the filter tabs (e.g. `observation_type`) |
| `hidden` | `string[]` | Field ids hidden from the search form entirely |
| `hidden_description` | `string[]` | Field ids whose info tooltip is suppressed |
| `hidden_scopes` | `string[]` | Scope ids removed from the UI — tab, fields, and (if only one scope remains) the "All data" tab. When all scopes are hidden, the entire tab group including the observation type selector is hidden. The search query automatically targets the single remaining visible scope |
| `bordered` | `string[]` | Group and scope ids rendered with a bordered box |

**`hidden_scopes` and `isShared` interaction:** A field is considered "shared" (rendered above the tabs in the common grid) only when it exists in every scope the backend reports via `/filtering_scopes` — not just the subset visible after `hidden_scopes` filtering. This means hiding a scope never accidentally promotes scope-specific fields (e.g. `diagnosis`) into the shared grid.

## groups.yaml (filter group structure)

`groups.yaml` defines which filter fields belong to which UI groups, in what order they render, and which groups are subgroups of another (via `parent`).

The file lives at `config/groups.yaml` (shared default). A service that needs to diverge from the shared structure creates `config/<service>/groups.yaml` — the build resolver picks it up automatically with no code change required.

Schema:

```yaml
- id: <group-id>
  label: "Group label"
  parent: <parent-group-id>   # optional — omit for root groups
  fields:
    - field_id_1              # field ids in render order
    - field_id_2
```

Group order in the file is the render order. Field order within each group is also yaml-defined. A field absent from `groups.yaml` will not appear anywhere in the UI (silently dropped) — keep the file in sync with the backend's `/filtering_terms` field list.

Groups without a `parent` render as flat sections. Groups with a `parent` render as labelled subgroups inside their parent's scope panel.

**Starting point for a new service:** copy `config/groups.yaml` to `config/<service>/groups.yaml` and edit from there. Only do this when the service genuinely needs a different structure; if the shared default is correct, no copy is needed.

## Theme (colors, fonts, logo)

Colors are already CSS custom properties (`--csc-color-*` and related). Each service gets its own theme file (for example `config/<service>/theme.scss`) defining these variables, plus its own logo file. Fonts are file-based, not just a font-family name swap, so each service bundles its own font files alongside its theme file. The build-time environment variable selects which service's theme directory is loaded.

## Content configuration (shared component text)

Shared view components that currently contain hardcoded text (Footer, HelpSidebar, and text areas such as SearchForm's filter hint) get their text from a per-service content configuration instead of hardcoding it. Each service has one content config file (for example `config/<service>/content.ts`) covering footer links, contact email, help content, and other shared-component text.

Components read this content through a composable (`useContentConfig()` in `src/composables/ui/useContentConfig.ts`) rather than receiving it purely as props passed down from views. The composable resolves to the currently loaded service's content config based on the same build-time environment variable used elsewhere. Shared components remain free of service-conditional branching; they only consume whatever content the composable returns.

`content.ts` may import service assets (e.g. logo images) using `@/assets/<service>/` paths — these imports are resolved by Vite at bundle time. Do not import `content.ts` from `vite.config.ts`; Node.js cannot resolve the `@/` alias or process binary asset imports. Use `meta.json` instead (see below).

The shared contract for `content.ts` is `ContentConfig` in `src/types/content.ts`. A new service's file must satisfy this interface:

```ts
import type { ContentConfig } from '@/types/content'

export const contentConfig = {
  // all required ContentConfig fields
} satisfies ContentConfig
```

Use `satisfies` (not `: ContentConfig`) — it enforces the contract while preserving the precise inferred type. Service-specific fields beyond `ContentConfig` may be added freely; `satisfies` permits extra fields. Consume those extra fields by importing directly from the service file, not through `useContentConfig()`, which returns the shared `ContentConfig` type only.

The full `ContentConfig` shape (from `src/types/content.ts`):

```ts
interface ContentConfig {
  navLogo: {
    src: string
    alt: string
  }
  footer: {
    links: { label: string; href: string; external?: boolean }[]
    contact: { email: string }
    fundingText: string
    logoSrc: string
    logoAlt: string
  }
  help: {
    sections: { id: string; title: string; html: string }[]
  }
  search: {
    filterHintHtml: string
  }
}
```

The UI is single-language at this stage; the content config does not need a locale key structure yet. If multi-language support becomes a requirement later, the content config's structure will need to be revisited.

## Page title and favicon

`index.html` is shared across services and uses Vite's HTML env-variable templating:

```html
<link rel="icon" type="image/x-icon" href="%VITE_APP_FAVICON%" />
<title>%VITE_APP_TITLE%</title>
```

These placeholders are replaced at build time by the `service-meta` Vite plugin in `vite.config.ts`. The plugin reads `appTitle` from `config/<service>/meta.json` and resolves the favicon from `src/assets/<service>/favicon.ico`.

- **Dev server** — favicon href is set to `/src/assets/<service>/favicon.ico` (served by Vite dev server).
- **Production build** — favicon is emitted to the dist root as `favicon.ico`; href is set to `/favicon.ico`.

If `src/assets/<service>/favicon.ico` does not exist, the plugin warns and skips the emit without failing the build.

## Build-time metadata (`meta.json`)

Each service has `config/<service>/meta.json` for values that `vite.config.ts` needs at Node.js / config-load time. Currently:

```json
{
  "appTitle": "Service Name"
}
```

This file exists because `content.ts` cannot be imported from `vite.config.ts` — it uses the `@/` Vite alias and Vite-specific binary asset imports that are not available in Node context. Keep `meta.json` to plain JSON; no TypeScript, no imports.

## Assets

Service-specific assets (logo used in the navbar, favicon) live under `src/assets/<service>/`. Shared assets used across services (e.g. login button icon) live under `src/assets/images/`.

Shared components that display service-specific assets (such as `AppNavbar`) source the asset path from `useContentConfig()` — they never hardcode a service's asset path directly.