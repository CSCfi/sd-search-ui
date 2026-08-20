---
description: Pinia vs TanStack Query rules, caching strategy. Read when working on state management or data fetching.
alwaysApply: false
---

# CSC Discovery — State Management

## Ownership Rules

| Data | Owner | Reason |
|---|---|---|
| Selected filters | Pinia | UI state — survives component unmount |
| Active tab / dataset type | Pinia | UI state — survives component unmount |
| Draft & committed qualifiers | Pinia | UI state — survives component unmount |
| Loading / error states | TanStack Query | Never duplicate in Pinia |
| Server data (results, options) | TanStack Query | Caching, deduplication, refetch |
| Auth status | Pinia | Synchronous, no server fetch |
| UI state (modal open, active tab) | Pinia or local `ref` | No server involvement |

**Rule: Pinia stores must never contain `isLoading`, `error`, or raw server response data.**

## TanStack Query — Query Keys and staleTime

| Query key | staleTime | enabled | Notes |
|---|---|---|---|
| `['filteringTerms']` | Infinity | always | `ui_display=false` fields filtered out via `select` |
| `['filteringGroups']` | Infinity | always | |
| `['filteringScopes']` | Infinity | always | |
| `['filteringQualifiers']` | Infinity | always | |
| `['values', fieldId, datasetType, qualifiers]` | 4h | always | |
| `['suggestions', fieldId, term, datasetType, qualifiers]` | 5min | `term.length > 1` | |
| `['search', 'clinical', committedFilters, committedQualifiers]` | — | `hasCommittedFilters && tab is 'all' or 'clinical'` | Uses `postQuery` |
| `['search', 'non_clinical', committedFilters, committedQualifiers]` | — | `hasCommittedFilters && tab is 'all' or 'non_clinical'` | Uses `postNonClinicalQuery` — always count granularity |

## Pinia — Search Store (`stores/searchStore.ts`)

### State

| Field | Type | Description |
|---|---|---|
| `draftFilters` | `BeaconQueryFilter[]` | Filters updated on every field change |
| `committedFilters` | `BeaconQueryFilter[]` | Filters from the last submitted search |
| `datasetType` | `DatasetType` | Active tab selection (`'all'` / `'clinical'` / `'non_clinical'`) |
| `committedDatasetType` | `DatasetType` | Tab from the last submitted search |
| `draftQualifiers` | `Record<string, string>` | Qualifiers updated on every change |
| `committedQualifiers` | `Record<string, string>` | Qualifiers from the last submitted search |

### Computed

| Name | Description |
|---|---|
| `hasCommittedFilters` | `true` when `committedFilters` is non-empty |

### Actions

| Action | Description |
|---|---|
| `setFilter(id, value, label?)` | Add/update/remove a draft filter. Empty value removes. `label[]` stores display names for concept IDs. |
| `removeFilters(ids[])` | Remove specific fields from draft only — `committedFilters` unchanged |
| `setDatasetType(type)` | Update draft tab selection |
| `resetScope()` | Reset both draft and committed tab to `'all'` — used on invalid `?tab=` URL value |
| `setQualifier(id, value)` | Update a draft qualifier. Value `'all'` removes the qualifier. |
| `resetQualifiers()` | Reset both draft and committed qualifiers — used on invalid `?qualifiers=` URL value |
| `commitQualifiers()` | Copy draft qualifiers to committed without touching filters or tab |
| `commit()` | Promote all draft state to committed and sync to URL |
| `clearFilters()` | Reset all state to defaults and clear URL |
| `initFromUrl(filters, scope?, qualifiers?)` | Populate store from URL on page load |
| `setUrlLabel(id, label[])` | Patch display labels onto a filter after concept ID resolution |

### URL Sync

`commit()` serializes state to `?`-query params:
- Each filter → `?{id}={value}` (array values joined with `,`)
- `tab` omitted when `'all'`
- `qualifiers` omitted when empty; format: `id:value,id:value`

`initFromUrl()` restores state on page load. Qualifiers from URL are **untrusted** — they stay
in `draftQualifiers` until `SearchForm` validates them against `/filtering_qualifiers`.
Invalid qualifiers trigger `resetQualifiers()` because the backend hard-rejects unknown qualifiers.

## What Goes Where — Decision Guide

```
Is this server data?
  Yes → TanStack Query
  No  →
    Does it need to persist across component unmounts?
      Yes → Pinia
      No  → local ref / reactive
```