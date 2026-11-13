import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import type { BeaconQueryRequest } from '@/types/beacon'

const post =
  vi.fn<(url: string, body: unknown, config?: AxiosRequestConfig) => Promise<{ data: unknown }>>()
const get = vi.fn<(url: string, config?: AxiosRequestConfig) => Promise<{ data: unknown }>>()

vi.mock('./apiClient', () => ({
  default: {
    post: (url: string, body: unknown, config?: AxiosRequestConfig) => post(url, body, config),
    get: (url: string, config?: AxiosRequestConfig) => get(url, config),
  },
}))

const dodClient = (await import('./dodClient')).default

const {
  postQuery,
  postNonClinicalQuery,
  getNonClinicalImageIds,
  interpretFilters,
  submitDatasetOnDemand,
} = await import('./api')

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

  it('omits includeComplementary unless explicitly enabled', async () => {
    await postQuery([{ id: 'sex', value: 'Female', operator: '=' }], 'clinical')
    expect(sentBody().query).not.toHaveProperty('includeComplementary')
  })

  it('sends includeComplementary only when explicitly enabled', async () => {
    await postQuery([{ id: 'sex', value: 'Female', operator: '=' }], 'clinical', true)
    expect(sentBody().query.includeComplementary).toBe(true)
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
})

describe('getNonClinicalImageIds', () => {
  beforeEach(() => {
    post.mockReset()
  })

  it('sends record granularity and non_clinical scope', async () => {
    post.mockResolvedValue({
      data: { response: { resultSet: [] } },
    })
    await getNonClinicalImageIds([{ id: 'sex', value: 'Female', operator: '=' }])
    const body = post.mock.calls[0]?.[1] as BeaconQueryRequest
    expect(body.query.requestedGranularity).toBe('record')
    expect(body.query.requestedScope).toBe('non_clinical')
  })

  it('extracts resultSet[].id into a flat string array', async () => {
    post.mockResolvedValue({
      data: {
        response: {
          resultSet: [{ id: 'img-1' }, { id: 'img-2' }, { id: 'img-3' }],
        },
      },
    })
    const ids = await getNonClinicalImageIds([{ id: 'sex', value: 'Female', operator: '=' }])
    expect(ids).toEqual(['img-1', 'img-2', 'img-3'])
  })

  it('returns empty array when resultSet is empty', async () => {
    post.mockResolvedValue({
      data: { response: { resultSet: [] } },
    })
    const ids = await getNonClinicalImageIds([{ id: 'sex', value: 'Female', operator: '=' }])
    expect(ids).toEqual([])
  })
})

// Real dodClient with a capturing adapter: URL, credentials and body are asserted as axios
// would send them.
function useDodResponse(status: number, data: unknown) {
  const requests: InternalAxiosRequestConfig[] = []
  dodClient.defaults.adapter = (config) => {
    requests.push(config)
    return Promise.resolve({ data, status, statusText: '', headers: {}, config })
  }
  return requests
}

function sentDodBody(request: InternalAxiosRequestConfig): unknown {
  return JSON.parse(request.data as string)
}

describe('interpretFilters', () => {
  const response = { interpretation: 'Male', answerable: true, filters: [] }

  beforeEach(() => {
    post.mockReset()
    post.mockResolvedValue({ data: response })
  })

  it('posts the query and the current filters to /ai/filters, without requestedScope', async () => {
    await interpretFilters(
      { query: 'male', filters: [{ id: 'sex', value: 'Male', operator: '=' }] },
      new AbortController().signal,
    )
    expect(post.mock.calls[0]?.[0]).toBe('/ai/filters')
    expect(post.mock.calls[0]?.[1]).toEqual({
      query: 'male',
      filters: [{ id: 'sex', value: 'Male', operator: '=' }],
    })
  })

  it('sends an empty filter list when the form has no filters', async () => {
    await interpretFilters({ query: 'male', filters: [] }, new AbortController().signal)
    expect(post.mock.calls[0]?.[1]).toEqual({ query: 'male', filters: [] })
  })

  it('keeps includeDescendantTerms and drops the UI-only label', async () => {
    await interpretFilters(
      {
        query: 'x',
        filters: [
          {
            id: 'animal_species',
            value: ['337915000'],
            operator: '=',
            includeDescendantTerms: true,
            label: ['Human'],
          },
        ],
      },
      new AbortController().signal,
    )
    expect(post.mock.calls[0]?.[1]).toEqual({
      query: 'x',
      filters: [
        { id: 'animal_species', value: ['337915000'], operator: '=', includeDescendantTerms: true },
      ],
    })
  })

  it('passes the abort signal and a 75 second timeout', async () => {
    const { signal } = new AbortController()
    await interpretFilters({ query: 'male', filters: [] }, signal)
    expect(post.mock.calls[0]?.[2]).toEqual({ signal, timeout: 75_000 })
  })

  it('returns the response body', async () => {
    await expect(
      interpretFilters({ query: 'male', filters: [] }, new AbortController().signal),
    ).resolves.toEqual(response)
  })
})

describe('submitDatasetOnDemand', () => {
  it('posts image_accessions to /dod with credentials and no user field', async () => {
    const requests = useDodResponse(200, {})
    await submitDatasetOnDemand(['img-1', 'img-2'])

    const [request] = requests
    expect(request?.method).toBe('post')
    expect(dodClient.getUri(request)).toBe('/dod')
    expect(request?.withCredentials).toBe(true)
    expect(sentDodBody(request!)).toEqual({ image_accessions: ['img-1', 'img-2'] })
  })

  it('resolves with undefined on 200', async () => {
    useDodResponse(200, {})
    await expect(submitDatasetOnDemand(['img-1'])).resolves.toBeUndefined()
  })
})
