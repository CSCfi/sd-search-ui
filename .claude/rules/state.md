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
  queryFn: getFilteringTerms,
  staleTime: Infinity,
})

// Field values with counts — cached 4h (matches backend cache TTL)
useQuery({
  queryKey: ['values', fieldId],
  queryFn: () => getFieldValues(fieldId),
  staleTime: 4 * 60 * 60 * 1000,
})

// Autocomplete suggestions — enabled only after user types 2+ chars
useQuery({
  queryKey: ['suggestions', fieldId, term],
  queryFn: () => getSuggestions(fieldId, term),
  enabled: term.length > 1,
  staleTime: 5 * 60 * 1000,  // 5 min
})

// Search results — enabled only when committed filters are set
useQuery({
  queryKey: ['search', committedFilters],
  queryFn: () => postQuery(committedFilters.value),
  enabled: hasCommittedFilters,
})
})
```

## Pinia — Search Store

```ts
// stores/searchStore.ts
export const useSearchStore = defineStore('search', () => {
    // Form state — updated on every field change
    const draftFilters = ref<BeaconQueryFilter[]>([])

    // Query state — updated only when user clicks Search
    const committedFilters = ref<BeaconQueryFilter[]>([])

    const hasCommittedFilters = computed(() => committedFilters.value.length > 0)

    const setFilter = (id: string, value: string | string[], includeDescendantTerms = true) => {
        const existing = draftFilters.value.findIndex((f) => f.id === id)
        const isEmpty = Array.isArray(value) ? value.length === 0 : value === ''

        if (isEmpty) {
            draftFilters.value = draftFilters.value.filter((f) => f.id !== id)
        } else if (existing >= 0) {
            draftFilters.value[existing] = { id, value, operator: '=', includeDescendantTerms }
        } else {
            draftFilters.value.push({ id, value, operator: '=', includeDescendantTerms })
        }
    }

    const commit = () => {
        committedFilters.value = [...draftFilters.value]
    }

    const clearFilters = () => {
        draftFilters.value = []
        committedFilters.value = []
    }

    return { draftFilters, committedFilters, hasCommittedFilters, setFilter, commit, clearFilters }
})
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