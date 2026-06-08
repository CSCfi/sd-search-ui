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

### E2E tests (Playwright — future)

Scope: full application in a real browser against a real or seeded backend.
Slow, but catches integration issues that unit tests miss.

Best for:
- Full search flow: select filters → submit → results appear
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
| RangePicker ISO 8601 output | Unit | 🔴 Critical | Easy to get wrong, hard to notice |
| OntologyPicker multiselect | Component | 🟡 High | Complex internal state |
| Full search flow | E2E | 🟡 High | Core user journey |
| Results rendering | Component | 🟢 Normal | Regression protection |
| Request access button | E2E | 🟢 Normal | Simple but user-facing |

---

## Critical: Dynamic Component Selection

This is the most important thing to test in the entire frontend.

The UI is schema-driven — `GET /filtering_terms` returns a list of fields, each with a
`type`. The frontend renders a different component based on that type. If the mapping
is wrong, the user sees the wrong input for a field and the query silently breaks.

**The mapping that must be tested:**

| `type` | Expected component |
|---|---|
| `text` | TextInput |
| `controlledValue` | c-select (CSC UI) |
| `ontology` | OntologyPicker |
| `ontologyOrValue` | OntologyPicker |
| `iso8601Range` | RangePicker |

Test each type explicitly. Also test that an unknown type does not silently render
a wrong component — it should either render nothing or throw a visible error.

---

## Critical: Filter Logic

The query sent to `POST /query` must follow these rules:

- **Different fields** → separate filter objects → backend treats as AND
- **Multiple values on the same field** → single filter with array value → backend treats as OR
- Setting a field to empty must remove it from the filters array entirely
- Updating an existing field must replace, not append

These rules live in `searchStore`. Test the store directly without mounting any UI.

---

## Critical: ISO 8601 Range

`age_at_extraction` is sent as `"P40Y-P50Y"`. The RangePicker must:

- Correctly format years as `PnY`, months as `PnM`, weeks as `PnW`, days as `PnD`
- Produce `"Pfrom-Pto"` format with a hyphen separator
- Not emit a value when `from > to`
- Not emit a value when the time unit is not selected

This is easy to get subtly wrong (e.g. `P40-P50Y` or `40Y-50Y`) and the backend
will silently return no results without any visible error.

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

When mocking API responses in component tests, use these codes for consistency.

---

## What Not to Test

- CSC UI web component internals (`c-button`, `c-select`) — these are a third-party library
- Vue Router navigation mechanics — trust the framework
- TanStack Query caching behavior — trust the library
- Visual appearance / CSS

---

## Naming Conventions

```
describe('ComponentName')
  it('renders OntologyPicker for type=ontology')
  it('renders RangePicker for type=iso8601Range')
  it('does not render when type is unknown')

describe('searchStore')
  it('adds a new filter')
  it('replaces existing filter for the same field')
  it('removes filter when value is empty')
  it('supports multiple values as OR within the same field')
```

Use plain English descriptions. Describe the expected behavior, not the implementation.

---

## Manual Testing Checklist

Run before every PR that touches the search form or results view.

### Schema rendering
- [ ] All fields from `/filtering_terms` appear in the UI
- [ ] Each field shows the correct input type (text / dropdown / autocomplete / range)
- [ ] No fields are missing or duplicated

### Filter logic
- [ ] Selecting Sex=Female and searching returns only female datasets
- [ ] Adding Anatomical site=Breast narrows results (AND)
- [ ] Adding Sex=Male to Sex field broadens results (OR within same field)
- [ ] Removing a filter updates results correctly

### Edge cases
- [ ] Search with no filters returns all datasets
- [ ] Search with filters that match nothing shows empty state, not an error
- [ ] Typing 1 character in OntologyPicker does not trigger suggestions
- [ ] Typing 2+ characters triggers suggestions
- [ ] Age range with from > to cannot be submitted

### Results
- [ ] Dataset title, description, and match counts are displayed
- [ ] "Request access" opens REMS in a new tab with correct URL
- [ ] "Clear search" resets all fields and removes results

### Auth
- [ ] Unauthenticated user is redirected to login
- [ ] Expired session during search redirects to logout