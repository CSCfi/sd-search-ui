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

describe('searchStore — datasetType scope', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('defaults both draft and committed scope to all', () => {
    const store = useSearchStore()
    expect(store.datasetType).toBe('all')
    expect(store.committedDatasetType).toBe('all')
  })

  it('changing the tab alone does not change the committed scope', () => {
    const store = useSearchStore()
    store.setDatasetType('clinical')
    expect(store.datasetType).toBe('clinical')
    expect(store.committedDatasetType).toBe('all')
  })

  it('commit copies datasetType to committedDatasetType', () => {
    const store = useSearchStore()
    store.setDatasetType('non_clinical')
    store.commit()
    expect(store.committedDatasetType).toBe('non_clinical')
  })

  it('initFromUrl sets both scopes when a scope is given', () => {
    const store = useSearchStore()
    store.initFromUrl([{ id: 'sex', value: 'Female', operator: '=' }], 'clinical')
    expect(store.datasetType).toBe('clinical')
    expect(store.committedDatasetType).toBe('clinical')
  })

  it('initFromUrl leaves the scope untouched when none is given', () => {
    const store = useSearchStore()
    store.setDatasetType('clinical')
    store.initFromUrl([{ id: 'sex', value: 'Female', operator: '=' }])
    expect(store.datasetType).toBe('clinical')
    expect(store.committedDatasetType).toBe('all')
  })
})

describe('searchStore — qualifiers', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('setQualifier writes the value to draft', () => {
    const store = useSearchStore()
    store.setQualifier('observation', 'confirmed')
    expect(store.draftQualifiers).toEqual({ observation: 'confirmed' })
  })

  it('setQualifier with "all" deletes the key', () => {
    const store = useSearchStore()
    store.setQualifier('observation', 'confirmed')
    store.setQualifier('observation', 'all')
    expect(store.draftQualifiers).toEqual({})
  })

  it('commit copies draftQualifiers to committedQualifiers', () => {
    const store = useSearchStore()
    store.setQualifier('observation', 'confirmed')
    store.commit()
    expect(store.committedQualifiers).toEqual({ observation: 'confirmed' })
  })

  it('committedQualifiers is an independent copy — mutating draft after commit does not affect it', () => {
    const store = useSearchStore()
    store.setQualifier('observation', 'confirmed')
    store.commit()
    store.setQualifier('observation', 'candidate')
    expect(store.committedQualifiers).toEqual({ observation: 'confirmed' })
    expect(store.draftQualifiers).toEqual({ observation: 'candidate' })
  })

  it('clearFilters empties both qualifier refs', () => {
    const store = useSearchStore()
    store.setQualifier('observation', 'confirmed')
    store.commit()
    store.clearFilters()
    expect(store.draftQualifiers).toEqual({})
    expect(store.committedQualifiers).toEqual({})
  })

  it('resetQualifiers empties both refs', () => {
    const store = useSearchStore()
    store.setQualifier('observation', 'confirmed')
    store.commit()
    store.resetQualifiers()
    expect(store.draftQualifiers).toEqual({})
    expect(store.committedQualifiers).toEqual({})
  })

  // Fail-open: a URL qualifier is unvalidated, so initFromUrl must not commit it. SearchForm
  // promotes it via commitQualifiers() once /filtering_qualifiers confirms it's valid — see
  // commitQualifiers tests below.
  it('initFromUrl sets draftQualifiers but leaves committedQualifiers empty', () => {
    const store = useSearchStore()
    store.initFromUrl([], undefined, { observation: 'confirmed' })
    expect(store.draftQualifiers).toEqual({ observation: 'confirmed' })
    expect(store.committedQualifiers).toEqual({})
  })

  it('commitQualifiers copies draftQualifiers to committedQualifiers', () => {
    const store = useSearchStore()
    store.initFromUrl([], undefined, { observation: 'confirmed' })
    store.commitQualifiers()
    expect(store.committedQualifiers).toEqual({ observation: 'confirmed' })
  })

  it('commitQualifiers does not touch draftFilters, committedFilters, or dataset type', () => {
    const store = useSearchStore()
    store.setFilter('anatomical_site', ['80248007'])
    store.setDatasetType('clinical')
    store.setQualifier('observation', 'confirmed')
    store.commitQualifiers()
    expect(store.committedFilters).toEqual([])
    expect(store.committedDatasetType).toBe('all')
  })

  it('initFromUrl leaves qualifiers untouched when none is given', () => {
    const store = useSearchStore()
    store.setQualifier('observation', 'confirmed')
    store.initFromUrl([{ id: 'sex', value: 'Female', operator: '=' }])
    expect(store.draftQualifiers).toEqual({ observation: 'confirmed' })
  })
})

describe('searchStore — removeFilters', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('drops the given ids from draftFilters', () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setFilter('finding', ['12710003'])
    store.removeFilters(['finding'])
    expect(store.draftFilters.map((f) => f.id)).toEqual(['sex'])
  })

  it('leaves committedFilters untouched', () => {
    const store = useSearchStore()
    store.setFilter('finding', ['12710003'])
    store.commit()
    store.removeFilters(['finding'])
    expect(store.draftFilters).toEqual([])
    expect(store.committedFilters.map((f) => f.id)).toEqual(['finding'])
  })

  it('ignores ids that are not set', () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.removeFilters(['diagnosis'])
    expect(store.draftFilters.map((f) => f.id)).toEqual(['sex'])
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

  it('resets both scopes to all', () => {
    const store = useSearchStore()
    store.setDatasetType('non_clinical')
    store.commit()
    store.clearFilters()
    expect(store.datasetType).toBe('all')
    expect(store.committedDatasetType).toBe('all')
  })
})
