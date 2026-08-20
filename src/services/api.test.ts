import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import type { BeaconQueryRequest } from '@/types/beacon'

const post = vi.fn<(url: string, body: BeaconQueryRequest) => Promise<{ data: unknown }>>()
const get = vi.fn<(url: string, config?: AxiosRequestConfig) => Promise<{ data: unknown }>>()

vi.mock('./apiClient', () => ({
  default: {
    post: (url: string, body: BeaconQueryRequest) => post(url, body),
    get: (url: string, config?: AxiosRequestConfig) => get(url, config),
  },
}))

const { postQuery, postNonClinicalQuery, getFieldValues, getSuggestions } = await import('./api')

function sentBody(): BeaconQueryRequest {
  return post.mock.calls[0]?.[1] as BeaconQueryRequest
}

describe('postQuery — requestedScope', () => {
  beforeEach(() => {
    post.mockReset()
    post.mockResolvedValue({ data: {} })
  })

  it('omits requestedScope when no scope is given', async () => {
    await postQuery([{ id: 'sex', value: 'Female', operator: '=' }])
    expect(sentBody().query).not.toHaveProperty('requestedScope')
  })

  it('sends the scope id verbatim when one is given', async () => {
    await postQuery([{ id: 'finding', value: ['12710003'], operator: '=' }], 'non_clinical')
    expect(sentBody().query.requestedScope).toBe('non_clinical')
  })

  it('always sends record granularity and the filters as given', async () => {
    const filters = [{ id: 'diagnosis', value: ['64033007'], operator: '=' as const }]
    await postQuery(filters, 'clinical')
    expect(sentBody().query.requestedGranularity).toBe('record')
    expect(sentBody().query.filters).toEqual(filters)
  })
})

describe('postNonClinicalQuery', () => {
  beforeEach(() => {
    post.mockReset()
    post.mockResolvedValue({ data: {} })
  })

  // These are hard-coded in the implementation, but we test them here to ensure that future changes don't break the expected behavior and leak full records.
  it('always sends count granularity and non_clinical scope', async () => {
    await postNonClinicalQuery([{ id: 'sex', value: 'Female', operator: '=' }])
    expect(sentBody().query.requestedGranularity).toBe('count')
    expect(sentBody().query.requestedScope).toBe('non_clinical')
  })

  it('sends bare qualifier values, not the "<id>:<value>" encoding', async () => {
    await postNonClinicalQuery([{ id: 'diagnosis', value: ['64033007'], operator: '=' }], {
      observation: 'confirmed',
    })
    expect(sentBody().query.requestedQualifiers).toEqual({ observation: ['confirmed'] })
  })

  it('sends an empty object when no qualifier is given', async () => {
    await postNonClinicalQuery([{ id: 'sex', value: 'Female', operator: '=' }])
    expect(sentBody().query.requestedQualifiers).toEqual({})
  })
})

describe('postQuery — requestedQualifiers', () => {
  beforeEach(() => {
    post.mockReset()
    post.mockResolvedValue({ data: {} })
  })

  it('sends bare values, not the "<id>:<value>" encoding', async () => {
    await postQuery([{ id: 'diagnosis', value: ['64033007'], operator: '=' }], 'clinical', {
      observation: 'confirmed',
    })
    expect(sentBody().query.requestedQualifiers).toEqual({ observation: ['confirmed'] })
  })

  it('sends an empty object when no qualifier is given', async () => {
    await postQuery([{ id: 'sex', value: 'Female', operator: '=' }])
    expect(sentBody().query.requestedQualifiers).toEqual({})
  })

  it('does not affect requestedScope handling', async () => {
    await postQuery([{ id: 'sex', value: 'Female', operator: '=' }], undefined, {
      observation: 'candidate',
    })
    expect(sentBody().query).not.toHaveProperty('requestedScope')
  })
})

describe('getFieldValues / getSuggestions — qualifier param serialization', () => {
  beforeEach(() => {
    get.mockReset()
    get.mockResolvedValue({ data: [] })
  })

  function sentConfig(): AxiosRequestConfig {
    return get.mock.calls[0]?.[1] as AxiosRequestConfig
  }

  function serialize(config: AxiosRequestConfig): string {
    return axios.getUri({ url: '', ...config })
  }

  it('getFieldValues sends bare repeated qualifier= params, not qualifier[]=', async () => {
    await getFieldValues('diagnosis', 'clinical', { observation: 'confirmed' })
    expect(serialize(sentConfig())).toContain('qualifier=observation:confirmed')
    expect(serialize(sentConfig())).not.toContain('qualifier%5B%5D=')
  })

  it('getSuggestions sends bare repeated qualifier= params, not qualifier[]=', async () => {
    await getSuggestions('diagnosis', 'car', new AbortController().signal, 'clinical', {
      observation: 'candidate',
    })
    expect(serialize(sentConfig())).toContain('qualifier=observation:candidate')
    expect(serialize(sentConfig())).not.toContain('qualifier%5B%5D=')
  })
})
