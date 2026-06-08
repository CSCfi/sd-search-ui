# CSC Discovery — Design System

## Brand Colors

```css
:root {
  --color-dark-blue:   #1c007a;  /* primary — headers, nav, primary buttons */
  --color-pink:        #ff457d;  /* accent — CTA, Search button, highlights */
  --color-light-pink:  #f2d9e8;  /* backgrounds, hover states, tags */
  --color-bright-blue: #2661db;  /* links, secondary actions, info */
  --color-light-grey:  #cccfdc;  /* borders, disabled states, subtle bg */
}
```

## Typography

Font: **Lato** — loaded locally from `src/assets/fonts/`.

Download the required weights from [Google Fonts](https://fonts.google.com/specimen/Lato)
and place the `.ttf` files in `src/assets/fonts/`.

```css
/* src/assets/fonts.css */
@font-face {
  font-family: 'Lato';
  src: url('@/assets/fonts/lato-light.ttf') format('truetype');
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Lato';
  src: url('@/assets/fonts/lato-regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Lato';
  src: url('@/assets/fonts/lato-black.ttf') format('truetype');
  font-weight: 900;
  font-style: normal;
  font-display: swap;
}

:root {
  --font-family: 'Lato', sans-serif;

  --font-weight-heading:    900;  /* Lato Black — letter-spacing: 0.15em */
  --font-weight-subheading: 300;  /* Lato Light */
  --font-weight-body:       400;  /* Lato Regular */
}
```

Import in `main.scss`:

```css
@import '@/assets/_fonts.css';
```

## Layout

Search panel uses dark blue background (`--color-dark-blue`).
Results section uses white background.
Search button is pink (`--color-pink`).

## CSC UI — Setup

### Installation

```bash
pnpm add @cscfi/csc-ui
```

`@cscfi/csc-ui-vue` is NOT published to npm separately —
`vControl` directive is implemented locally in `src/directives/vControl.ts`.

### main.ts

```ts
import { defineCustomElements } from '@cscfi/csc-ui/loader'
import { vControl } from '@/directives/vControl'

app.directive('control', vControl)
defineCustomElements()  // registers all c-* custom elements
```

`applyPolyfills` is deprecated — do not use.

### vite.config.ts — required

```ts
vue({
  template: {
    compilerOptions: {
      isCustomElement: (tag) => tag.startsWith('c-'),
    },
  },
})
```

Without this Vue emits warnings for every `c-*` element.

### main.scss

```css
@import '@/assets/fonts.css';
```
Do NOT import @cscfi/csc-ui/css/theme.css — it applies CSC UI's own color palette
(teal-based, museo-sans font) which conflicts with the project's brand colors.
CSC UI components are used unstyled and styled via project's own CSS variables.

## CSC UI — Component API

### v-control directive

Required on every `c-*` form component to enable `v-model`.
Listens to `changeValue` custom event and dispatches native `input` event.

```vue
<c-text-field v-model="value" v-control label="Label" />
<c-select v-model="selected" v-control label="Label" :items="options" />
```

### c-text-field

```vue
<c-text-field
    v-model="value"
    v-control
    label="Field label"
    placeholder="Type here"
/>
```

### c-select

```vue
<c-select
    v-model="selected"
    v-control
    label="Select label"
    :items="options"
/>
```

Items format — **must use `name`, not `label`:**

```ts
type CSelectItem = {
    name: string
    value: string | number
    disabled?: boolean
}
```

### c-button

```vue
<c-button @click="handleClick">Search</c-button>
<c-button variant="outlined" @click="handleClear">Clear</c-button>
```

## Custom Components

Components that CSC UI does not provide — built from scratch using brand tokens:

| Component | Purpose |
|---|---|
| `<OntologyPicker>` | SNOMED CT autocomplete + multiselect for `ontology` and `ontologyOrValue` fields |
| `<RangePicker>` | ISO 8601 duration range input for `age_at_extraction` |

These components should use the brand CSS variables for visual consistency.

## vControl Directive — Source

```ts
// src/directives/vControl.ts

const eventHandler = (el: HTMLInputElement) => (event: CustomEvent) => {
    el.value = event?.detail ?? null
    el.dispatchEvent(new Event('input', { bubbles: true }))
}

const handlers = new WeakMap<HTMLInputElement, EventListener>()

export const vControl = {
    mounted(el: HTMLInputElement) {
        const handler = eventHandler(el) as EventListener
        handlers.set(el, handler)
        el.addEventListener('changeValue', handler)
    },
    beforeUnmount(el: HTMLInputElement) {
        const handler = handlers.get(el)
        if (handler) {
            el.removeEventListener('changeValue', handler)
            handlers.delete(el)
        }
    },
}
```