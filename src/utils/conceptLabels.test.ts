import { describe, expect, it } from 'vitest'
import { resolveConceptLabels } from './conceptLabels'

const values = [
  { value: 'Human', count: 10, concept_id: '337915000' },
  { value: 'Mouse', count: 4, concept_id: '447612001' },
  { value: 'free text', count: 1, concept_id: null },
]

describe('resolveConceptLabels', () => {
  it('returns the listed label for a known concept id', () => {
    expect(resolveConceptLabels(['337915000'], values)).toEqual(['Human'])
  })

  it('uses the id as its own label when it is not listed', () => {
    expect(resolveConceptLabels(['999'], values)).toEqual(['999'])
  })

  it('keeps input order and resolves each id independently', () => {
    expect(resolveConceptLabels(['447612001', '999', '337915000'], values)).toEqual([
      'Mouse',
      '999',
      'Human',
    ])
  })

  it('does not match entries without a concept id', () => {
    expect(resolveConceptLabels(['free text'], values)).toEqual(['free text'])
  })
})
