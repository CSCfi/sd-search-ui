import { setActivePinia, createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { router } from '@service-router'
import { fieldsConfig } from '@/services/config'
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

  it('sets includeDescendantTerms when passed as true', () => {
    const store = useSearchStore()
    store.setFilter('anatomical_site', ['80248007'], undefined, true)
    expect(store.draftFilters[0]).toMatchObject({ includeDescendantTerms: true })
  })

  it('omits includeDescendantTerms when not passed', () => {
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

describe('searchStore — switchScope', () => {
  const fieldScopes = new Map([
    ['sex', ['clinical', 'non_clinical']],
    ['diagnosis', ['clinical']],
    ['finding', ['non_clinical']],
  ])

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('sets the draft tab and returns the dropped field ids', () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setFilter('diagnosis', ['1'])
    const dropped = store.switchScope('non_clinical', fieldScopes)
    expect(store.datasetType).toBe('non_clinical')
    expect(dropped).toEqual(['diagnosis'])
    expect(store.draftFilters.map((f) => f.id)).toEqual(['sex'])
  })

  it('keeps filters for ids that are not in the field-scope map', () => {
    const store = useSearchStore()
    store.setFilter('observation_type', 'confirmed')
    expect(store.switchScope('clinical', fieldScopes)).toEqual([])
    expect(store.draftFilters).toHaveLength(1)
  })

  it('drops nothing when switching to all', () => {
    const store = useSearchStore()
    store.setFilter('diagnosis', ['1'])
    expect(store.switchScope('all', fieldScopes)).toEqual([])
    expect(store.draftFilters).toHaveLength(1)
  })

  it('drops nothing when the field-scope map is not loaded yet', () => {
    const store = useSearchStore()
    store.setFilter('diagnosis', ['1'])
    expect(store.switchScope('non_clinical')).toEqual([])
    expect(store.datasetType).toBe('non_clinical')
  })

  it('does not touch committed filters or the committed tab', () => {
    const store = useSearchStore()
    store.setFilter('diagnosis', ['1'])
    store.commit()
    store.switchScope('non_clinical', fieldScopes)
    expect(store.committedFilters.map((f) => f.id)).toEqual(['diagnosis'])
    expect(store.committedDatasetType).toBe('all')
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

describe('searchStore — includeComplementary toggle', () => {
  const original = fieldsConfig.complementary

  beforeEach(() => {
    setActivePinia(createPinia())
    fieldsConfig.complementary = true
  })

  afterEach(() => {
    fieldsConfig.complementary = original
  })

  it('defaults both draft and committed toggle to false', () => {
    const store = useSearchStore()
    expect(store.includeComplementary).toBe(false)
    expect(store.committedIncludeComplementary).toBe(false)
  })

  it('setting the draft toggle alone does not change the committed value', () => {
    const store = useSearchStore()
    store.setIncludeComplementary(true)
    expect(store.includeComplementary).toBe(true)
    expect(store.committedIncludeComplementary).toBe(false)
  })

  it('commit copies the draft toggle to the committed toggle', () => {
    const store = useSearchStore()
    store.setIncludeComplementary(true)
    store.commit()
    expect(store.committedIncludeComplementary).toBe(true)
  })

  it('clearFilters resets both toggle values to false', () => {
    const store = useSearchStore()
    store.setIncludeComplementary(true)
    store.commit()
    store.clearFilters()
    expect(store.includeComplementary).toBe(false)
    expect(store.committedIncludeComplementary).toBe(false)
  })

  it('initFromUrl sets both toggle values when complementary is true', () => {
    const store = useSearchStore()
    store.initFromUrl([{ id: 'sex', value: 'Female', operator: '=' }], undefined, true)
    expect(store.includeComplementary).toBe(true)
    expect(store.committedIncludeComplementary).toBe(true)
  })

  it('initFromUrl leaves the toggle untouched when complementary is not given', () => {
    const store = useSearchStore()
    store.initFromUrl([{ id: 'sex', value: 'Female', operator: '=' }])
    expect(store.includeComplementary).toBe(false)
    expect(store.committedIncludeComplementary).toBe(false)
  })
})

describe('searchStore — complementary disabled by service config', () => {
  const original = fieldsConfig.complementary

  beforeEach(() => {
    setActivePinia(createPinia())
    fieldsConfig.complementary = false
  })

  afterEach(() => {
    fieldsConfig.complementary = original
    vi.restoreAllMocks()
  })

  it('setIncludeComplementary(true) is a no-op', () => {
    const store = useSearchStore()
    store.setIncludeComplementary(true)
    expect(store.includeComplementary).toBe(false)
  })

  it('initFromUrl ignores complementary=true', () => {
    const store = useSearchStore()
    store.initFromUrl([{ id: 'sex', value: 'Female', operator: '=' }], undefined, true)
    expect(store.includeComplementary).toBe(false)
    expect(store.committedIncludeComplementary).toBe(false)
    expect(store.committedFilters).toHaveLength(1)
  })

  it('commit never enables the committed flag or writes complementary to the URL', () => {
    const replace = vi.spyOn(router, 'replace').mockResolvedValue(undefined)
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setIncludeComplementary(true)
    store.commit()
    expect(store.committedIncludeComplementary).toBe(false)
    expect(replace).toHaveBeenCalledWith({ query: { sex: 'Female' } })
  })

  it('treats an omitted config key as disabled', () => {
    fieldsConfig.complementary = undefined
    const store = useSearchStore()
    store.setIncludeComplementary(true)
    expect(store.includeComplementary).toBe(false)
  })
})
