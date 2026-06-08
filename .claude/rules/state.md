---
description: Pinia vs TanStack Query rules, caching strategy. Read when working on state management or data fetching.
alwaysApply: false
---

# CSC Discovery — State Management

## Ownership Rules

| Data | Owner | Reason |
|---|---|---|
| Selected filters | Pinia | UI state — survives component unmount |
| Loading / error states | TanStack Query | Never duplicate in Pinia |
| Server data (results, options) | TanStack Query | Caching, deduplication, refetch |
| Auth status | Pinia (cookie read) | Synchronous, no server fetch |
| UI state (modal open, active tab) | Pinia or local `ref` | No server involvement |

**Rule: Pinia stores must never contain `isLoading`, `error`, or raw server response data.**

## TanStack Query — Query Keys and staleTime

```ts
// Filter field definitions — static, fetched once
useQuery({
  queryKey: ['filteringTerms'],
  queryFn: fetchFilteringTerms,
  staleTime: Infinity,
})

// Field values with counts — cached 4h (matches backend cache TTL)
useQuery({
  queryKey: ['values', fieldId],
  queryFn: () => fetchFieldValues(fieldId),
  staleTime: 4 * 60 * 60 * 1000,
})

// Autocomplete suggestions — enabled only after user types 2+ chars
useQuery({
  queryKey: ['suggestions', fieldId, term],
  queryFn: () => fetchSuggestions(fieldId, term),
  enabled: term.length > 1,
  staleTime: 5 * 60 * 1000,  // 5 min
})

// Search results — enabled only when filters are set
useQuery({
  queryKey: ['search', filters],
  queryFn: () => postQuery(filters),
  enabled: filters.length > 0,
})
```

## Pinia — Search Store

```ts
// stores/searchStore.ts
export const useSearchStore = defineStore('search', () => {
  // Active filters sent to POST /query
  const filters = ref<BeaconQueryFilter[]>([])

  const setFilter = (id: string, value: string | string[]) => {
    const existing = filters.value.findIndex((f) => f.id === id)
    const isEmpty = Array.isArray(value) ? value.length === 0 : value === ''

    if (isEmpty) {
      filters.value = filters.value.filter((f) => f.id !== id)
    } else if (existing >= 0) {
      filters.value[existing] = { id, value, operator: '=' }
    } else {
      filters.value.push({ id, value, operator: '=' })
    }
  }

  const clearFilters = () => {
    filters.value = []
  }

  return { filters, setFilter, clearFilters }
})
```

## Query Key Conventions

Always use arrays. Include all variables that affect the result:

```ts
['filteringTerms']                    // no variables
['values', fieldId]                   // varies per field
['suggestions', fieldId, term]        // varies per field + search term
['search', filters]                   // varies per full filter set
```

This ensures proper cache invalidation and deduplication.

## What Goes Where — Decision Guide

```
Is this server data?
  Yes → TanStack Query
  No  →
    Does it need to persist across component unmounts?
      Yes → Pinia
      No  → local ref / reactive
```