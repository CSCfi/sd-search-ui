import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSearchStore } from './searchStore'

describe('searchStore — setFilter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('adds a new filter', () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    expect(store.filters).toEqual([{ id: 'sex', value: 'Female', operator: '=' }])
  })

  it('replaces existing filter for the same field', () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setFilter('sex', 'Male')
    expect(store.filters).toHaveLength(1)
    expect(store.filters[0]?.value).toBe('Male')
  })

  it('removes filter when value is empty string', () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setFilter('sex', '')
    expect(store.filters).toEqual([])
  })

  it('removes filter when value is empty array', () => {
    const store = useSearchStore()
    store.setFilter('anatomical_site', ['80248007'])
    store.setFilter('anatomical_site', [])
    expect(store.filters).toEqual([])
  })

  it('supports string value', () => {
    const store = useSearchStore()
    store.setFilter('dataset_description', 'lung carcinoma')
    expect(store.filters[0]?.value).toBe('lung carcinoma')
  })

  it('supports string array value — OR logic', () => {
    const store = useSearchStore()
    store.setFilter('anatomical_site', ['80248007', '64033007'])
    expect(store.filters[0]?.value).toEqual(['80248007', '64033007'])
  })

  it('multiple different fields — AND logic', () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setFilter('anatomical_site', ['80248007'])
    expect(store.filters).toHaveLength(2)
    expect(store.filters.map((f) => f.id)).toEqual(['sex', 'anatomical_site'])
  })

  it('clearFilters resets to empty array', () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setFilter('anatomical_site', ['80248007'])
    store.clearFilters()
    expect(store.filters).toEqual([])
  })
})
