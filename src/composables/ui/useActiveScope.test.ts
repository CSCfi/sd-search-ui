import { describe, expect, it } from 'vitest'
import type { BeaconQueryFilter } from '@/types/beacon'
import { resolveScope, scopeForField, type ScopeInputs } from './useActiveScope'

const f = (id: string): BeaconQueryFilter => ({ id, value: 'x', operator: '=' })

const base: ScopeInputs = {
  scopeTabs: false,
  hiddenScopes: [],
  scopeIds: ['clinical', 'non_clinical'],
  fieldScopes: new Map([
    ['sex', ['clinical', 'non_clinical']],
    ['diagnosis', ['clinical']],
    ['finding', ['non_clinical']],
  ]),
}

describe('resolveScope — tabs off', () => {
  it('returns all with no filters', () => {
    expect(resolveScope([], 'all', base)).toBe('all')
  })

  it('returns all with only shared filters', () => {
    expect(resolveScope([f('sex')], 'all', base)).toBe('all')
  })

  it('returns clinical when a clinical-only filter is set', () => {
    expect(resolveScope([f('sex'), f('diagnosis')], 'all', base)).toBe('clinical')
  })

  it('returns non_clinical when a non-clinical-only filter is set', () => {
    expect(resolveScope([f('finding')], 'all', base)).toBe('non_clinical')
  })

  it('returns mixed for a conflicting set', () => {
    expect(resolveScope([f('diagnosis'), f('finding')], 'all', base)).toBe('mixed')
  })

  it('ignores the stored tab value', () => {
    expect(resolveScope([f('diagnosis')], 'non_clinical', base)).toBe('clinical')
  })

  it('returns null while field scopes are loading', () => {
    expect(resolveScope([f('diagnosis')], 'all', { ...base, fieldScopes: undefined })).toBeNull()
  })

  it('returns null while scope ids are loading', () => {
    expect(resolveScope([f('diagnosis')], 'all', { ...base, scopeIds: undefined })).toBeNull()
  })

  it('returns the only visible scope when the other is hidden', () => {
    expect(resolveScope([], 'all', { ...base, hiddenScopes: ['non_clinical'] })).toBe('clinical')
  })
})

describe('resolveScope — tabs on', () => {
  it('returns the stored tab value, even while data is loading', () => {
    const on = { ...base, scopeTabs: true, fieldScopes: undefined, scopeIds: undefined }
    expect(resolveScope([f('finding')], 'clinical', on)).toBe('clinical')
  })
})

describe('scopeForField', () => {
  it('keeps the scope for a field that belongs to it', () => {
    expect(scopeForField('clinical', ['clinical'])).toBe('clinical')
    expect(scopeForField('non_clinical', ['clinical', 'non_clinical'])).toBe('non_clinical')
  })

  it('falls back to all for a field outside the scope, so the backend gets no scope', () => {
    expect(scopeForField('non_clinical', ['clinical'])).toBe('all')
  })

  it('keeps the scope when the field scopes are unknown', () => {
    expect(scopeForField('clinical', undefined)).toBe('clinical')
  })

  it('stays all for all', () => {
    expect(scopeForField('all', ['clinical'])).toBe('all')
  })
})
