---
description: Design system, brand colors, typography, CSS variables, icons, CSC UI setup. Read when building or styling any UI component.
alwaysApply: false
---

# CSC Discovery — Design System

## Brand Colors

All colors are CSS custom properties defined in `src/assets/styles/_variables.scss`.

| Variable | Value | Usage |
|---|---|---|
| `--color-dark-blue` | `#1c007a` | Primary — headers, nav, primary buttons |
| `--color-pink` | `#ff457d` | Accent — CTA, Search button, highlights |
| `--color-light-pink` | `#f2d9e8` | Backgrounds, hover states, tags |
| `--color-bright-blue` | `#2661db` | Links, secondary actions, info |
| `--color-light-grey` | `#cccfdc` | Borders, disabled states, subtle bg |
| `--color-light-purple` | `#f2f0f7` | Footer background |
| `--color-text` | `#1c1c1c` | Primary body text |
| `--color-surface` | `#fafafa` | Input/control backgrounds |
| `--color-text-secondary` | `#666` | Muted / placeholder text |
| `--color-white` | `#ffffff` | |

### Scope accent colors

Scope colors are defined as RGB channel triples so alpha variants can be derived without extra variables:

| Variable | Usage |
|---|---|
| `--color-scope-clinical-rgb` | `120 140 255` |
| `--color-scope-clinical-light-rgb` | `168 182 255` — text-safe tint for dark blue panel |
| `--color-scope-non-clinical-rgb` | `221 122 51` |
| `--color-scope-non-clinical-light-rgb` | `249 168 102` — text-safe tint for dark blue panel |

Usage: `rgb(var(--color-scope-clinical-rgb) / 0.15)` for translucent fills.

## Typography

Font: **Lato** — loaded locally from `src/assets/fonts/`. Files: `Lato-Light.ttf`, `Lato-Regular.ttf`, `Lato-Black.ttf`.

Font faces are defined in `src/assets/styles/_fonts.scss` and imported via `main.scss` with `@use 'fonts'`.

Only three weights are loaded — do not use other values. The browser will synthesize missing weights and the result will differ from the real font.

| Variable | Weight | Face |
|---|---|---|
| `--font-weight-heading` | `900` | Lato Black — use with `letter-spacing: 0.15em` |
| `--font-weight-subheading` | `300` | Lato Light |
| `--font-weight-body` | `400` | Lato Regular |

## Layout

Search panel uses dark blue background (`--color-dark-blue`).
Results section uses white background.
Search button is pink (`--color-pink`).

## Breakpoints

Mixins are in `src/assets/styles/_mixins.scss` and auto-imported globally via `vite.config.ts` — no `@use` needed in components.

| Mixin | Breakpoint |
|---|---|
| `@include tablet` | `min-width: 48rem` (768px) |
| `@include desktop-small` | `min-width: 64rem` (1024px) |
| `@include desktop-large` | `min-width: 81.25rem` (1300px) |

**Pattern: mobile-first.** Write media query mixins at the **top level** of the scoped style block, not nested inside selectors.

## Icons

Library: `@lucide/vue`. Import icons individually — tree-shakeable.

| Icon | Usage |
|---|---|
| `Search` | Search button |
| `RotateCcw` | Clear/reset button |
| `Key` | Request access button |
| `ChevronDown` / `ChevronUp` | Dropdown trigger open/close state |
| `X` | Remove tag in OntologyPicker |
| `Loader` | Loading spinner |
| `Info` | Field info tooltip trigger |
| `Link` | Copy filter URL button |

## CSC UI — Setup

`@cscfi/csc-ui-vue` is NOT published to npm separately — `vControl` directive is implemented locally in `src/directives/vControl.ts`.

Register in `main.ts`:

```ts
import { defineCustomElements } from '@cscfi/csc-ui/loader'
import { vControl } from '@/directives/vControl'

app.directive('control', vControl)
defineCustomElements()  // registers all c-* custom elements
```

`applyPolyfills` is deprecated — do not use.

Suppress Vue warnings for web components in `vite.config.ts`:

```ts
vue({
  template: {
    compilerOptions: {
      isCustomElement: (tag) => tag.startsWith('c-'),
    },
  },
})
```

Do NOT import `@cscfi/csc-ui/css/theme.css` — it applies CSC UI's own color palette (teal-based, museo-sans font) which conflicts with the project's brand colors. CSC UI components are used unstyled and styled via the project's own CSS variables.

## CSC UI — Component API

### v-control directive

Required on every `c-*` form component to enable `v-model`. Listens to `changeValue` custom event and dispatches a native `input` event.

### c-select — items format

Must use `name`, not `label`:

```ts
type CSelectItem = {
  name: string
  value: string | number
  disabled?: boolean
}
```

### Styling CSC UI components

Do not target internal shadow DOM classes (e.g. `is-primary`, `is-active`) — they are implementation details and may change. Style via exposed CSS custom properties or by wrapping the component in your own element.

## Custom Components

| Component | Purpose |
|---|---|
| `<TextField>` | `type=text` and `type=keyword` fields |
| `<MultiSelect>` | `type=controlledValue` fields — custom dropdown with search |
| `<OntologyPicker>` | `type=ontology` (`:allow-free-text="false"`) and `type=ontologyOrValue` / `type=keyword` (`:allow-free-text="true"`) |
| `<RangePicker>` | `type=iso8601Range` — ISO 8601 duration range input |
| `<FieldLabel>` | Shared label + optional info tooltip for all field components |
| `<FieldInfoTooltip>` | Toggletip showing field description — shown unless field id is in `HIDDEN_DESCRIPTION_FIELD_IDS` |