# CSC Discovery — Implementation Spec

## Context

Scaffold is complete. The following already exists:
- `src/assets/styles/` — `_variables.scss`, `_fonts.scss`, `_base.scss`, `main.scss`, `modern-normalize`
- `src/directives/vControl.ts` — v-model bridge for CSC UI web components
- `src/router/` — empty, needs implementation
- `src/stores/` — empty, needs implementation
- CSC UI registered in `main.ts` via `defineCustomElements()`
- `v-control` directive registered globally

Rules with additional context:
- API endpoints, types, query format → `.claude/rules/endpoints.md`
- Design tokens, CSC UI component API → `.claude/rules/design-system.md`
- Auth pattern, env variables → `.claude/rules/auth.md`
- Pinia vs TanStack Query rules → `.claude/rules/state.md`
- Error handling strategy → `.claude/rules/errors.md`
- Accessibility requirements → `.claude/rules/accessibility.md`
- Testing strategy → `.claude/rules/testing.md`

---

## Step 1 — TypeScript Types

File: `src/types/beacon.ts`

Define all types derived from the backend Beacon V2 models. No invented types —
derive strictly from the backend response shapes documented in `endpoints.md`.

Required types:
- `BeaconFilteringTermType` — union of all field type strings
- `BeaconFilteringTerm` — single field definition from `GET /filtering_terms`
- `BeaconFilteringTermsResponse` — full response wrapper
- `BeaconQueryFilter` — single filter sent in `POST /query`
- `BeaconResultSetResult` — single dataset result
- `BeaconResultSet` — dataset wrapper with `id` and `results`
- `BeaconResultSets` — wrapper containing `resultSet: BeaconResultSet[]`
- `BeaconResultSetsResponse` — full query response with `meta`, `responseSummary`, `response`
- `FieldValue` — item from `/filtering_terms/{field_id}/suggestions` and `/filtering_terms/{field_id}/values`

Do not define `BeaconBooleanResponse`, `BeaconCountResponse`, or `BeaconQueryGranularity` —
frontend always uses `record` granularity. No type guards needed.

---

## Step 2 — API Service Layer

Files:
- `src/services/apiClient.ts` — Axios instance with `baseURL: import.meta.env.VITE_API_BASE_URL`
  and `withCredentials: true`. Response interceptor redirects to
  `import.meta.env.VITE_LOGOUT_URL` on 401.
- `src/services/api.ts` — all endpoint functions, imports Axios instance from `apiClient.ts`

Export the following functions from `api.ts`. All return typed promises — no `any`.

```ts
getFilteringTerms(): Promise<BeaconFilteringTermsResponse>
getFieldValues(fieldId: string): Promise<FieldValueCount[]>
getSuggestions(fieldId: string, term: string): Promise<FieldValueSuggestion[]>
postQuery(filters: BeaconQueryFilter[]): Promise<BeaconResultSetsResponse>
checkSession(): Promise<boolean>
```

`postQuery` unwraps `AxiosResponse` — returns `res.data` of type `BeaconResultSetsResponse`.

`postQuery` always sends `requestedGranularity: "record"` — hardcoded, not a parameter.

`postQuery` sends `requestedGranularity: "record"` inside the `query` object, not at the top level:
```ts
{
  query: {
    filters: BeaconQueryFilter[],
    requestedGranularity: "record"
  }
}
```

The Beacon V2 protocol supports three granularities (`boolean`, `count`, `record`)
designed for privacy — unauthenticated clients may only receive `boolean` or `count`.
CSC Discovery users are always authenticated via LifeScience AAI, so `record`
is always available. Other granularities are not needed in the frontend.

`checkSession` calls `GET import.meta.env.VITE_ACCOUNT_INFO` and returns `true` if
response is 200, `false` otherwise. Does not throw.

---

## Step 3 — Pinia Stores

### `src/stores/searchStore.ts`

State:
- `draftFilters: BeaconQueryFilter[]` — form state, updated on every field change
- `committedFilters: BeaconQueryFilter[]` — query state, updated only on commit

Computed:
- `hasCommittedFilters` — true when `committedFilters.length > 0`

Actions:
- `setFilter(id, value: string | string[], includeDescendantTerms?: boolean)` — add or replace
  filter for field id in `draftFilters`. Remove the filter entirely if value is empty string or empty array.
  `includeDescendantTerms` defaults to `true` — only relevant for `ontology` and `ontologyOrValue` fields.
- `commit()` — copies `draftFilters` to `committedFilters`
- `clearFilters()` — resets both arrays to `[]`

No loading, error, or server data in this store. See `state.md`.

### `src/stores/authStore.ts`

State:
- `isLoggedIn: ComputedRef<boolean>` — derived from `logged_in=True` cookie, not stored

No server fetching in this store. Cookie is read synchronously.

---

## Step 4 — TanStack Query Composables

File: `src/composables/useFilteringTerms.ts`

```ts
// staleTime: Infinity — static data, never refetches
useFilteringTerms(): { data, isLoading, isError }
```

File: `src/composables/useFieldValues.ts`

```ts
// staleTime: 4 hours — matches backend cache TTL
useFieldValues(fieldId: string): { data, isLoading, isError }
```

File: `src/composables/useSuggestions.ts`

```ts
// enabled only when term.length >= 2
// staleTime: 5 minutes
useSuggestions(fieldId: string, term: Ref<string>): { data, isLoading }
```

File: `src/composables/useSearch.ts`

```ts
Reads `committedFilters` and `hasCommittedFilters` directly from `searchStore` via `storeToRefs`.
No parameters.

// enabled only when committedFilters.length > 0
// queryKey includes full committedFilters array so each unique query is cached separately
useSearch(): { data, isLoading, isError }
```

---

## Step 5 — Router

File: `src/router/index.ts`

Routes:
- `/` → `LoginView` — public, redirect to `/search` if already logged in
- `/search` → `SearchView` — requires auth
- `/:pathMatch(.*)` → `NotFoundView`

Navigation guard: before each route that requires auth, check `logged_in` cookie.
If not present, redirect to `import.meta.env.VITE_LOGIN_URL` (external URL —
use `window.location.href`, not `router.push`).

---

## Step 6 — Dynamic Field Component

File: `src/components/dynamic/DynamicField.vue`

Props: `field: BeaconFilteringTerm`

Renders the correct input component based on `field.type`. Extracts only the props
each child component needs — child components do not receive the full `BeaconFilteringTerm` object.

| `field.type` | Component | Props passed |
|---|---|---|
| `text` | `TextInput` | `label`, `modelValue` |
| `controlledValue` | `MultiSelect` | `label`, `fieldId`, `modelValue` |
| `ontology` | `OntologyPicker` | `label`, `fieldId`, `modelValue` |
| `ontologyOrValue` | `OntologyPicker` | `label`, `fieldId`, `modelValue` |
| `iso8601Range` | `RangePicker` | `label`, `modelValue` |

Unknown type: render nothing and log a console warning.

Uses `searchStore.setFilter` to update filters on value change.
Each component receives the current value from `searchStore.filters`.


---

## Step 7 — Field Components

### `src/components/dynamic/TextInput.vue`

Props: `label: string`, `modelValue: string`
Emits: `update:modelValue`

Renders `<c-text-field>` with `v-control`. Plain text search — no dropdown, no prefilled values.

### `src/components/dynamic/MultiSelect.vue`

Props: `label: string`, `fieldId: string`, `modelValue: string[]`, `allowFreeText?: boolean`
Emits: `update:modelValue`

**Do not use `c-select`** — it does not support multiselect and closes after first selection.
Build a custom dropdown component matching the MVP visual pattern (see screenshot reference).

All field types use this component — `controlledValue`, `ontology`, and `ontologyOrValue`
are all multiselect. There is no single-select in this application.

Uses `useFieldValues(fieldId)` to fetch available options.

Behavior:
- Trigger button shows "All" when nothing selected, or first selected value + `+N` badge for additional selections
- Dropdown opens on trigger click, closes on outside click or Escape
- Dropdown stays open after each selection — user can select multiple values without reopening
- Search input at the top of the dropdown to filter options
- Reset button (↺) next to search input to clear search term
- Options are plain list items — clicking toggles selection, selected items are visually highlighted
- No explicit "clear all" button needed — deselecting all items returns to "All" state

Items are `FieldValueCount[]` — display `item.value`, use `item.value` as the stored value.
`item.count` can be shown next to the label optionally.

Show loading state while fetching.

Accessibility: `role="listbox"`, each option `role="option"`, `aria-selected`,
trigger button `aria-expanded`, `aria-haspopup="listbox"`.

### `src/components/dynamic/OntologyPicker.vue`

Props: `label: string`, `fieldId: string`, `modelValue: string[]`, `allowFreeText: boolean`
Emits: `update:modelValue`, `update:includeDescendantTerms`

Used for both `ontology` and `ontologyOrValue` fields.

- `ontology` — `allowFreeText: false` — only SNOMED terms from `/suggestions`
- `ontologyOrValue` — `allowFreeText: true` — SNOMED terms + free-text input allowed

Internal state:
- `searchTerm: string` — current input value
- `selectedItems: FieldValueSuggestion[]` — selected items displayed as removable tags
- `includeDescendantTerms: boolean` — default `true`

Uses `useSuggestions(fieldId, searchTerm)` — enabled when `searchTerm.length >= 2`.
When `allowFreeText` is false, only SNOMED concepts (`concept_id` set) are shown.
When `allowFreeText` is true, free-text values (`concept_id: null`) are also shown.
Emit `term` string for free-text items, concept ID for SNOMED items.
On suggestion click: add to `selectedItems`, clear input, emit updated value array.
On tag remove: remove from `selectedItems`, emit updated array.

**Include descendants checkbox:**
- Shown below the input
- Checked by default
- Label: "Include descendant terms"
- On toggle: emit `update:includeDescendantTerms` — `DynamicField` passes this to `searchStore.setFilter`

Accessibility: implement combobox ARIA pattern as specified in `accessibility.md`.

On suggestions fetch error: silently hide dropdown (TBD per `errors.md`).

Accessibility: implement combobox ARIA pattern as specified in `accessibility.md`.

On suggestions fetch error: silently hide dropdown (TBD per `errors.md`).

### `src/components/dynamic/RangePicker.vue`

Props: `label: string`, `modelValue: string`
Emits: `update:modelValue`

Internal state: `from: number | null`, `to: number | null`, `unit: 'Y' | 'M' | 'W' | 'D' | null`

Emits ISO 8601 range string only when `from`, `to`, and `unit` are all set and `from <= to`.
Format: `P{from}{unit}-P{to}{unit}` e.g. `P40Y-P50Y`.

Unit selector options: Years, Months, Weeks, Days.

Validation: do not emit when `from > to`. Show inline error message.


---

## Step 8 — Search Form

File: `src/components/SearchForm.vue`

Uses `useFilteringTerms()` to fetch field definitions.

Renders:
- Loading state while `isLoading`
- Full-page error when `isError` (see `errors.md` — "Service is currently unavailable")
- One `<DynamicField>` per field in the response when loaded

Layout: dark blue background panel (`--color-dark-blue`). Two rows of four fields.
Below fields: pink Search button (`--color-pink`) + "Clear search" text button.

Search button: calls `searchStore.commit()`.
Clear button: calls `searchStore.clearFilters()`.


---

## Step 9 — Results

### `src/components/ResultsBanner.vue`

Shows active filter tags above the results list.
Reads from `searchStore.committedFilters`.
Each tag displays the filter id and value. Not interactive.

### `src/components/ResultsTable.vue` (replaces ResultsList.vue and ResultsItem.vue)

Renders search results as a semantic HTML table.

States:
- No filters committed: render nothing
- Loading: loading indicator
- Error: banner with "Search failed. Please try again." (see `errors.md`)
- Empty results: "No results found"
- Results: table with one row per result

Table structure:
- Wrapper div with `overflow-x: auto` for narrow viewports
- `<caption>` with "Search results", visually hidden
- Column headers: `<th scope="col">` for Title, Description, Images, (empty for action)
- One `<tr>` per `BeaconResultSetResult` (flatMap over `resultSet`)

Columns per row:
- Title: `datasetTitle` or `datasetId` if title is null
- Description: truncated to 80 characters. "Show more" button opens `<DescriptionModal>`
- Images: `{matchingImageCount} / {totalImageCount}`
- Action: "Request access" outlined button, `aria-label="Request access for {datasetTitle}"`

"Request access" opens REMS in a new tab:
```ts
window.open(
  `https://bp-rems.sd.csc.fi/apply-for?resource=${result.datasetId}`,
  '_blank',
  'noopener,noreferrer'
)
```
Note: `accessionId` not yet in backend response — using `datasetId` as fallback.
Update when backend adds `accessionId` to `BeaconResultSetResult`.

Uses `useSearch()`.

### `src/components/DescriptionModal.vue`

Props: `description: string`, `title: string`, `modelValue: boolean` (open state)
Emits: `update:modelValue`

Displays full dataset description in a modal dialog.

Accessibility:
- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby` pointing to modal title element
- Focus trap while open
- Escape key closes modal
- Returns focus to trigger element on close

---

## Step 10 — Views

### `src/views/LoginView.vue`

Full-page layout with dark blue background.
"Login" button links to `import.meta.env.VITE_LOGIN_URL`.
If `authStore.isLoggedIn`, redirect to `/search` on mount.

### `src/views/SearchView.vue`

Composes `<SearchForm>` and `<ResultsList>`.
Search form at top (dark background), results below (white background).

### `src/views/NotFoundView.vue`

Simple 404 page.

---

## Step 11 — Error Banner Component

File: `src/components/ui/ErrorBanner.vue`

Props: `message: string`
Emits: `dismiss`

Dismissible banner shown above content area on query errors.
Uses `--color-pink` or a dedicated error color — check `_variables.scss`.
`role="alert"` for screen reader announcement.

---

## Testing Selectors

Add `data-testid` only when no reliable semantic selector exists (role, label, text content).
Do not add `data-testid` by default — use accessible roles and labels in tests instead.

- Read `.claude/rules/` files relevant to each step before implementing
- Write types first — do not start component code without types in place
- Use `script setup` syntax throughout — no Options API
- All components use `lang="ts"`
- Follow accessibility requirements in `accessibility.md` for all interactive components
- Do not add features not listed in this spec