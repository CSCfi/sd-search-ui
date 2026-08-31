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
| `['values', fieldId, datasetType]` | 4h | always | |
| `['suggestions', fieldId, term, datasetType]` | 5min | `term.length > 1` | |
| `['deploymentStatus']` | 5min | always | `refetchInterval: 5min` too — polls while mounted. Uses `getStatus` |
| `['search', 'clinical', committedFilters]` | — | `hasCommittedFilters && tab is 'all' or 'clinical'` | Uses `postQuery` |
| `['search', 'non_clinical', committedFilters]` | — | `hasCommittedFilters && tab is 'all' or 'non_clinical'` | Uses `postNonClinicalQuery` — always count granularity |

## Pinia — Search Store (`stores/searchStore.ts`)

### State

| Field | Type | Description |
|---|---|---|
| `draftFilters` | `BeaconQueryFilter[]` | Filters updated on every field change |
| `committedFilters` | `BeaconQueryFilter[]` | Filters from the last submitted search |
| `datasetType` | `DatasetType` | Active tab selection (`'all'` / `'clinical'` / `'non_clinical'`) |
| `committedDatasetType` | `DatasetType` | Tab from the last submitted search |

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
| `commit()` | Promote all draft state to committed and sync to URL |
| `clearFilters()` | Reset all state to defaults and clear URL |
| `initFromUrl(filters, scope?)` | Populate store from URL on page load |
| `setUrlLabel(id, label[])` | Patch display labels onto a filter after concept ID resolution |

### URL Sync

`commit()` serializes state to `?`-query params:
- Each filter → `?{id}={value}` (array values joined with `,`)
- `tab` omitted when `'all'`

`initFromUrl()` restores state on page load. `observation_type` is an ordinary filter in `draftFilters` — URL-restored via the normal filter path, no special handling.

## What Goes Where — Decision Guide

```
Is this server data?
  Yes → TanStack Query
  No  →
    Does it need to persist across component unmounts?
      Yes → Pinia
      No  → local ref / reactive
```