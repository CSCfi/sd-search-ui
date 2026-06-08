---
description: Accessibility requirements and implementation guidelines (WCAG 2.1 AA). Read when building or reviewing any UI component.
alwaysApply: false
---

# CSC Discovery — Accessibility

## Target

**WCAG 2.1 Level AA**

---

## General Requirements

- All interactive elements reachable and operable by keyboard
- All form fields have visible labels — never placeholder-only
- Error messages announced to screen readers (`role="alert"` or `aria-live="polite"`)
- Color is never the only means of conveying information
- Focus indicators visible on all interactive elements
- Sufficient contrast — 4.5:1 for normal text, 3:1 for large text and UI components

---

## CSC UI Components

`c-*` web components handle their own ARIA internally. Always verify with a screen
reader that selections and state changes are announced correctly — web components
can have gaps in ARIA support that are not visible in code.

---

## Custom Components

OntologyPicker and RangePicker are built from scratch — full ARIA responsibility
falls on the frontend team.

### OntologyPicker

Implements the ARIA combobox pattern:

- Input: `role="combobox"`, `aria-expanded`, `aria-autocomplete="list"`, `aria-controls`
- Listbox: `role="listbox"`
- Options: `role="option"`, `aria-selected`
- Active option communicated via `aria-activedescendant` on the input
- Selected tags: each remove button needs explicit label e.g.
  `aria-label="Remove Lung structure"`

### RangePicker

- Two number inputs, each with an associated `<label>`
- Constraint communicated via `aria-describedby` pointing to a hint element
  e.g. "From must be less than To"
- Validation error announced via `role="alert"`

---

## Testing Accessibility

- Keyboard-only navigation through a full search flow as a smoke test before every PR
- Run axe-core on key views — use `vitest-axe` in component tests or the browser extension
- Test with VoiceOver (macOS) or NVDA (Windows) before release