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
    expect(store.draftFilters).toEqual([{ id: 'sex', value: 'Female', operator: '=' }])
  })

  it('replaces existing filter for the same field', () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setFilter('sex', 'Male')
    expect(store.draftFilters).toHaveLength(1)
    expect(store.draftFilters[0]?.value).toBe('Male')
  })

  it('removes filter when value is empty string', () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setFilter('sex', '')
    expect(store.draftFilters).toEqual([])
  })

  it('removes filter when value is empty array', () => {
    const store = useSearchStore()
    store.setFilter('anatomical_site', ['80248007'])
    store.setFilter('anatomical_site', [])
    expect(store.draftFilters).toEqual([])
  })

  it('supports string value', () => {
    const store = useSearchStore()
    store.setFilter('dataset_description', 'lung carcinoma')
    expect(store.draftFilters[0]?.value).toBe('lung carcinoma')
  })

  it('supports string array value — OR logic', () => {
    const store = useSearchStore()
    store.setFilter('anatomical_site', ['80248007', '64033007'])
    expect(store.draftFilters[0]?.value).toEqual(['80248007', '64033007'])
  })

  it('multiple different fields — AND logic', () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setFilter('anatomical_site', ['80248007'])
    expect(store.draftFilters).toHaveLength(2)
    expect(store.draftFilters.map((f) => f.id)).toEqual(['sex', 'anatomical_site'])
  })

  it('sets includeDescendantTerms when provided', () => {
    const store = useSearchStore()
    store.setFilter('anatomical_site', ['80248007'], true)
    expect(store.draftFilters[0]?.includeDescendantTerms).toBe(true)
  })

  it('omits includeDescendantTerms when not provided', () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    expect(store.draftFilters[0]).not.toHaveProperty('includeDescendantTerms')
  })
})

describe('searchStore — commit', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('copies draftFilters to committedFilters', () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setFilter('anatomical_site', ['80248007'])
    store.commit()
    expect(store.committedFilters).toEqual(store.draftFilters)
  })

  it('committedFilters is independent copy — mutating draft does not affect committed', () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.commit()
    store.setFilter('sex', 'Male')
    expect(store.committedFilters[0]?.value).toBe('Female')
    expect(store.draftFilters[0]?.value).toBe('Male')
  })

  it('hasCommittedFilters is false before commit', () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    expect(store.hasCommittedFilters).toBe(false)
  })

  it('hasCommittedFilters is true after commit', () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.commit()
    expect(store.hasCommittedFilters).toBe(true)
  })
})

describe('searchStore — clearFilters', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('resets draftFilters to empty array', () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.clearFilters()
    expect(store.draftFilters).toEqual([])
  })

  it('resets committedFilters to empty array', () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.commit()
    store.clearFilters()
    expect(store.committedFilters).toEqual([])
  })

  it('hasCommittedFilters is false after clearFilters', () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.commit()
    store.clearFilters()
    expect(store.hasCommittedFilters).toBe(false)
  })
})
