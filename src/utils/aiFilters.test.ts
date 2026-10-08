import { describe, expect, it } from 'vitest'
import { deriveScope, normalizeAge, toStoreFilter } from './aiFilters'

describe('normalizeAge', () => {
  it.each([
    ['P40Y-P60Y', 'P40Y-P60Y'],
    ['P6M-P24M', 'P6M-P24M'],
    ['P2W-P4W', 'P2W-P4W'],
    ['P10D-P20D', 'P10D-P20D'],
    ['P12M-P24M', 'P12M-P24M'],
  ])('passes the same-unit range %s through unchanged', (input, expected) => {
    expect(normalizeAge(input)).toBe(expected)
  })

  it.each([
    ['P40Y', 'P40Y-P40Y'],
    ['P6M', 'P6M-P6M'],
    ['P10D', 'P10D-P10D'],
  ])('turns the single duration %s into a range', (input, expected) => {
    expect(normalizeAge(input)).toBe(expected)
  })

  it('converts a compound single duration to months', () => {
    expect(normalizeAge('P1Y6M')).toBe('P18M-P18M')
  })

  it('converts mixed months and years to months', () => {
    expect(normalizeAge('P6M-P2Y')).toBe('P6M-P24M')
  })

  it('converts mixed whole years and months to years when both bounds are whole years', () => {
    expect(normalizeAge('P12M-P3Y')).toBe('P1Y-P3Y')
  })

  it('converts to days when weeks or days are involved', () => {
    expect(normalizeAge('P2W-P1M')).toBe('P14D-P30D')
    expect(normalizeAge('P1Y2D')).toBe('P367D-P367D')
  })

  it.each(['P60Y-P40Y', 'P2Y-P6M', 'P', 'abc', '', 'P1.5Y', '-P2Y', 'P40Y-'])(
    'returns null for %s',
    (input) => {
      expect(normalizeAge(input)).toBeNull()
    },
  )
})

describe('deriveScope', () => {
  const fieldScopes = new Map([
    ['sex', ['clinical', 'non_clinical']],
    ['diagnosis', ['clinical']],
    ['finding', ['non_clinical']],
  ])
  const all = ['clinical', 'non_clinical']

  it('switches to the single scope of a scope-only field, also from the all tab', () => {
    expect(deriveScope(['finding'], fieldScopes, all, 'all')).toEqual({
      kind: 'switch',
      scope: 'non_clinical',
    })
    expect(deriveScope(['diagnosis', 'sex'], fieldScopes, all, 'non_clinical')).toEqual({
      kind: 'switch',
      scope: 'clinical',
    })
  })

  it('keeps the tab when the single scope already is the active tab', () => {
    expect(deriveScope(['finding'], fieldScopes, all, 'non_clinical')).toEqual({ kind: 'keep' })
  })

  it('keeps the tab when only shared fields are returned', () => {
    expect(deriveScope(['sex'], fieldScopes, all, 'clinical')).toEqual({ kind: 'keep' })
    expect(deriveScope(['sex'], fieldScopes, all, 'all')).toEqual({ kind: 'keep' })
  })

  it('reports a mix of clinical-only and non-clinical-only fields', () => {
    expect(deriveScope(['diagnosis', 'finding'], fieldScopes, all, 'all')).toEqual({
      kind: 'mixed',
    })
  })

  it('keeps the tab when no returned field has known scopes', () => {
    expect(deriveScope(['unknown'], fieldScopes, all, 'clinical')).toEqual({ kind: 'keep' })
  })
})

describe('toStoreFilter', () => {
  const species = [
    { value: 'Human', count: 5, concept_id: '337915000' },
    { value: 'Mouse', count: 2, concept_id: '447612001' },
  ]

  it('keeps controlled values as given', () => {
    expect(toStoreFilter('controlledValue', { id: 'sex', value: 'Female', operator: '=' })).toEqual(
      { id: 'sex', value: 'Female' },
    )
  })

  it('keeps a text value and rejects a list for a text field', () => {
    expect(
      toStoreFilter('text', { id: 'dataset_description', value: 'lung', operator: '=' }),
    ).toEqual({ id: 'dataset_description', value: 'lung' })
    expect(
      toStoreFilter('text', { id: 'dataset_description', value: ['a'], operator: '=' }),
    ).toBeNull()
  })

  it('normalizes the age range and rejects an unusable one', () => {
    expect(
      toStoreFilter('iso8601Range', { id: 'age_at_extraction', value: 'P40Y', operator: '=' }),
    ).toEqual({ id: 'age_at_extraction', value: 'P40Y-P40Y' })
    expect(
      toStoreFilter('iso8601Range', { id: 'age_at_extraction', value: 'nope', operator: '=' }),
    ).toBeNull()
  })

  it('labels a listed concept id and sets includeDescendantTerms for ontology fields', () => {
    expect(
      toStoreFilter(
        'ontology',
        { id: 'animal_species', value: ['337915000'], operator: '=' },
        species,
      ),
    ).toEqual({
      id: 'animal_species',
      value: ['337915000'],
      labels: ['Human'],
      includeDescendantTerms: true,
    })
  })

  it('uses the id as its own label when the concept is not listed', () => {
    expect(
      toStoreFilter('ontology', { id: 'animal_species', value: '999', operator: '=' }, species),
    ).toMatchObject({ value: ['999'], labels: ['999'] })
  })

  it('treats an ontologyOrValue value without a concept as free text', () => {
    expect(
      toStoreFilter(
        'ontologyOrValue',
        { id: 'fixation_type', value: ['formalin', '337915000'], operator: '=' },
        species,
      ),
    ).toEqual({
      id: 'fixation_type',
      value: ['formalin', '337915000'],
      labels: ['formalin', 'Human'],
      includeDescendantTerms: true,
    })
  })

  it('wraps keyword values in a list, without descendants, labelled by themselves', () => {
    expect(
      toStoreFilter('keyword', { id: 'staining_target', value: 'CD3', operator: '=' }),
    ).toEqual({ id: 'staining_target', value: ['CD3'], labels: ['CD3'] })
  })

  it('ignores operator and includeDescendantTerms from the backend', () => {
    const result = toStoreFilter('controlledValue', {
      id: 'sex',
      value: 'Male',
      operator: '=',
      includeDescendantTerms: true,
    })
    expect(result).toEqual({ id: 'sex', value: 'Male' })
  })
})
