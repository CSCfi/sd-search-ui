import { onUnmounted, ref } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  getFieldValues,
  getFilteringScopes,
  getFilteringTerms,
  interpretFilters,
} from '@/services/api'
import { fieldsConfig } from '@/services/config'
import { useSearchStore } from '@/stores/searchStore'
import type { AIInterpretation, BeaconFilteringTerm, FieldValue } from '@/types/beacon'
import { deriveScope, toStoreFilter, type StoreFilter } from '@/utils/aiFilters'

const ONTOLOGY_TYPES = new Set<BeaconFilteringTerm['type']>(['ontology', 'ontologyOrValue'])

// Store actions that mean the user changed the filter form by hand (or reset it).
const MANUAL_ACTIONS = new Set([
  'setFilter',
  'removeFilters',
  'switchScope',
  'setDatasetType',
  'setIncludeComplementary',
  'clearFilters',
])

export type AIInputState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; interpretation: string; switchedTo?: string; removed: string[] }
  | { kind: 'not-understood'; interpretation: string }
  | { kind: 'mixed-scope' }
  | { kind: 'error' }

/**
 * Natural-language filter input. `submit` asks the backend for filters, then applies the
 * response completely or not at all: labels are fetched first, nothing is written to the
 * store when any step fails, and the search is committed once at the end.
 *
 * Returns `true` from `submit` only when the filters were applied.
 */
export function useAIFilterInput() {
  const queryClient = useQueryClient()
  const store = useSearchStore()
  const state = ref<AIInputState>({ kind: 'idle' })
  const mutation = useMutation({
    mutationFn: ({ query, signal }: { query: string; signal: AbortSignal }) =>
      interpretFilters(query, signal),
  })

  let controller: AbortController | null = null
  // Our own writes happen while the state is still `loading`, which this ignores, and the
  // result state is set only after them. So only later, manual changes dismiss the message.
  store.$onAction(({ name }) => {
    if (MANUAL_ACTIONS.has(name) && state.value.kind !== 'loading') state.value = { kind: 'idle' }
  })

  onUnmounted(() => controller?.abort())

  function dismiss() {
    if (state.value.kind !== 'loading') state.value = { kind: 'idle' }
  }

  function cancel() {
    controller?.abort()
    controller = null
    state.value = { kind: 'idle' }
  }

  async function submit(text: string): Promise<boolean> {
    if (controller) return false
    const current = new AbortController()
    controller = current
    state.value = { kind: 'loading' }

    try {
      const response = await mutation.mutateAsync({ query: text, signal: current.signal })
      if (current.signal.aborted) return false
      return await apply(response, current.signal)
    } catch {
      // An abort is a user decision, not a failure: cancel() already reset the state.
      if (current.signal.aborted) return false
      state.value = { kind: 'error' }
      return false
    } finally {
      if (controller === current) controller = null
    }
  }

  async function fetchValues(fieldId: string): Promise<FieldValue[]> {
    // Same key as useFieldValues on the All tab, so the picker reuses the cached list.
    return queryClient.fetchQuery({
      queryKey: ['values', fieldId, 'all'],
      queryFn: () => getFieldValues(fieldId, 'all'),
      staleTime: 4 * 60 * 60 * 1000,
    })
  }

  async function apply(response: AIInterpretation, signal: AbortSignal): Promise<boolean> {
    const [termsResponse, scopes] = await Promise.all([
      queryClient.fetchQuery({
        queryKey: ['filteringTerms'],
        queryFn: getFilteringTerms,
        staleTime: Infinity,
      }),
      queryClient.fetchQuery({
        queryKey: ['filteringScopes'],
        queryFn: getFilteringScopes,
        staleTime: Infinity,
      }),
    ])
    const terms = new Map(termsResponse.response.filteringTerms.map((t) => [t.id, t] as const))

    // The backend sees every field. Drop what the form cannot show (hidden or unknown fields).
    const usable = response.filters.filter(
      (f) => terms.has(f.id) && !fieldsConfig.hidden.includes(f.id),
    )
    if (usable.length === 0) {
      state.value = { kind: 'not-understood', interpretation: response.interpretation }
      return false
    }

    const valuesByField = new Map<string, FieldValue[]>()
    await Promise.all(
      usable
        .filter((f) => ONTOLOGY_TYPES.has(terms.get(f.id)!.type))
        .map(async (f) => valuesByField.set(f.id, await fetchValues(f.id))),
    )

    const mapped: StoreFilter[] = []
    for (const f of usable) {
      const result = toStoreFilter(terms.get(f.id)!.type, f, valuesByField.get(f.id))
      if (result === null) {
        state.value = { kind: 'error' }
        return false
      }
      mapped.push(result)
    }

    const fieldScopes = new Map(
      termsResponse.response.filteringTerms.map((t) => [t.id, t.scopes] as const),
    )
    const decision = deriveScope(
      mapped.map((f) => f.id),
      fieldScopes,
      scopes.map((s) => s.id),
      store.datasetType,
    )
    if (decision.kind === 'mixed') {
      state.value = { kind: 'mixed-scope' }
      return false
    }

    // Last point of no return: a cancel during the lookups above must change nothing.
    if (signal.aborted) return false

    let removed: string[] = []
    let switchedTo: string | undefined
    // Tab first, so the fields exist in the form before their values are written.
    if (decision.kind === 'switch') {
      removed = store
        .switchScope(decision.scope, fieldScopes)
        .map((id) => terms.get(id)?.label ?? id)
      switchedTo = scopes.find((s) => s.id === decision.scope)?.label ?? decision.scope
    }
    for (const f of mapped) {
      store.setFilter(f.id, f.value, f.labels, f.includeDescendantTerms)
    }
    store.commit()

    state.value = {
      kind: 'success',
      interpretation: response.interpretation,
      removed,
      ...(switchedTo !== undefined ? { switchedTo } : {}),
    }
    return true
  }

  return { state, submit, cancel, dismiss }
}
