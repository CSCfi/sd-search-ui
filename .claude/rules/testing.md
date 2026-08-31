---
description: Testing strategy, priorities, manual checklist. Read when writing or reviewing tests.
alwaysApply: false
---

# CSC Discovery — Testing Strategy

## Philosophy

Test behavior, not implementation. A test should answer:
**"Does this work correctly for the user?"** — not "does this function return X".

Prefer fewer, high-value tests over comprehensive coverage of trivial code.

## Test Levels

### Unit tests (Vitest)

Scope: individual functions, stores, composables.
No DOM, no mounting. Fast and deterministic.

Best for:
- `searchStore` filter logic (setFilter, clearFilters, AND/OR behavior)
- ISO 8601 range formatting utility (RangePicker output)
- API response parsing / type mapping

### Component tests (Vitest + Vue Test Utils)

Scope: single component in isolation with mocked dependencies.
Mount the component, interact with it, assert on output.

Best for:
- Dynamic field rendering — does `type: "ontology"` render OntologyPicker?
- OntologyPicker internal state (selection, tag removal, suggestion triggering)
- RangePicker validation (from > to, missing unit)
- SearchForm scope tab rendering and observation type selector behavior
- NonClinicalResults display states (loading, error, empty, count)

### E2E tests (Playwright — future)

Scope: full application in a real browser against a real or seeded backend.
Slow, but catches integration issues that unit tests miss.

Best for:
- Full search flow: select filters → submit → results appear
- Tab switching between clinical / non-clinical
- Request access button opens correct REMS URL
- Clear search resets all fields and results
- Auth redirect when session is invalid

E2E is not in scope for the initial build. Add once the core search flow is stable.

---

## Priority Matrix

| Area | Level | Priority | Reason |
|---|---|---|---|
| Dynamic component selection | Component | 🔴 Critical | Wrong component = silent incorrect behavior |
| searchStore AND/OR logic | Unit | 🔴 Critical | Wrong query structure = wrong results |
| searchStore scope logic | Unit | 🔴 Critical | Draft/committed separation must be correct |
| RangePicker ISO 8601 output | Unit | 🔴 Critical | Easy to get wrong, hard to notice |
| OntologyPicker multiselect | Component | 🟡 High | Complex internal state |
| SearchForm scope tabs + observation type selector | Component | 🟡 High | Schema-driven rendering |
| NonClinicalResults display states | Component | 🟡 High | Count-only response, no resultSet |
| Full search flow | E2E | 🟡 High | Core user journey |
| Results rendering | Component | 🟢 Normal | Regression protection |
| Request access button | E2E | 🟢 Normal | Simple but user-facing |

---

## Critical: Dynamic Component Selection

The UI is schema-driven — `GET /filtering_terms` returns a list of fields, each with a `type`.
The frontend renders a different component based on that type. If the mapping is wrong, the user
sees the wrong input and the query silently breaks.

**The mapping that must be tested:**

| `type` | Expected component | Props |
|---|---|---|
| `text` | `<TextField>` | — |
| `keyword` | `<OntologyPicker>` | `:allow-free-text="true"` |
| `controlledValue` | `<MultiSelect>` | — |
| `ontology` | `<OntologyPicker>` | `:allow-free-text="false"` |
| `ontologyOrValue` | `<OntologyPicker>` | `:allow-free-text="true"` |
| `iso8601Range` | `<RangePicker>` | — |

Also test that an unknown type renders nothing and logs a console warning.

---

## Critical: Filter Logic

The query sent to `POST /query` must follow these rules:

- **Different fields** → separate filter objects → backend treats as AND
- **Multiple values on the same field** → single filter with array value → backend treats as OR
- Setting a field to empty must remove it from the filters array entirely
- Updating an existing field must replace, not append
- `removeFilters(ids)` removes from draft only — `committedFilters` must stay unchanged
- `clearFilters()` resets both draft and committed, including scope

Test the store directly without mounting any UI.

---

## Critical: Scope Logic

Draft and committed state are separate — changing the tab without committing must not affect the active query.

- `datasetType` changes do not touch `committedDatasetType` until `commit()`
- `observation_type` is an ordinary filter in `draftFilters` — draft/committed separation handled by `setFilter`/`commit()` like any other field

---

## Critical: ISO 8601 Range

`age_at_extraction` is sent as `"P40Y-P50Y"`. The RangePicker must:

- Correctly format years as `PnY`, months as `PnM`, weeks as `PnW`, days as `PnD`
- Produce `"Pfrom-Pto"` format with a hyphen separator
- Not emit a value when `from > to`
- Not emit a value when the time unit is not selected

---

## Test Data

Use the SNOMED codes from the integration test fixtures — these are real codes
that exist in the backend dev data:

```
Human:  337915000    Mouse:  447612001
Breast: 80248007     Kidney: 64033007
FFPE:   431510009    Paraffin: 311731000
HE:     12710003     IHC: 406917005
```

---

## Naming Conventions

Describe blocks use `'ComponentName'` or `'storeName — section'` format:

```
describe('DynamicField')
  it('renders OntologyPicker for type=ontology')
  it('passes allowFreeText=false to OntologyPicker for type=ontology')
  it('renders OntologyPicker for type=keyword')
  it('renders nothing and logs warning for unknown type')

describe('searchStore — setFilter')
  it('adds a new filter')
  it('replaces existing filter for the same field')
  it('removes filter when value is empty array')
  it('supports string array value — OR logic')
  it('multiple different fields — AND logic')

describe('ObservationTypeSelector')
  it('calls store.setFilter when a value pill is clicked')
  it('calls store.removeFilters when the All pill is clicked')
```

Use plain English descriptions. Describe the expected behavior, not the implementation.

---

## What Not to Test

- CSC UI web component internals (`c-button`, `c-select`) — third-party library
- Vue Router navigation mechanics — trust the framework
- TanStack Query caching behavior — trust the library
- Visual appearance / CSS

---

## Manual Testing Checklist

Run before every PR that touches the search form or results view.

### Schema rendering
- [ ] All fields from `/filtering_terms` appear in the UI
- [ ] Each field shows the correct input type (text / dropdown / autocomplete / range)
- [ ] No fields are missing or duplicated
- [ ] Fields with `ui_display: false` are hidden

### Filter logic
- [ ] Selecting Sex=Female and searching returns only female datasets
- [ ] Adding Anatomical site=Breast narrows results (AND)
- [ ] Adding Sex=Male to Sex field broadens results (OR within same field)
- [ ] Removing a filter updates results correctly

### Tabs and scope
- [ ] All data tab shows both clinical and non-clinical results
- [ ] Clinical tab shows only clinical results
- [ ] Non-clinical tab shows only the image count, no dataset details
- [ ] Switching tabs clears filters that belong to the other scope
- [ ] Invalid `?tab=` URL value is reset silently

### Observation type
- [ ] Selecting Confirmed / Candidate updates results
- [ ] Selecting All removes the observation_type filter

### Edge cases
- [ ] Search with no filters shows a prompt to select at least one filter — does not submit
- [ ] Search with filters that match nothing shows empty state, not an error
- [ ] Typing 1 character in OntologyPicker does not trigger suggestions
- [ ] Typing 2+ characters triggers suggestions
- [ ] Age range with from > to cannot be submitted

### Results
- [ ] Dataset title, description, and match counts are displayed
- [ ] Non-clinical panel shows total matching image count
- [ ] "Apply for access" opens REMS in a new tab with correct URL
- [ ] "Clear search" resets all fields, tabs, and removes results

### Auth
- [ ] Unauthenticated user is redirected to login
- [ ] Expired session during search redirects to logout