import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import type { BeaconQueryRequest } from '@/types/beacon'

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()
  return {
    default: {
      ...actual.default,
      post: vi.fn<(url: string, body: BeaconQueryRequest) => Promise<{ data: unknown }>>(),
      get: vi.fn<(url: string, config?: AxiosRequestConfig) => Promise<{ data: unknown }>>(),
      isAxiosError: actual.default.isAxiosError,
    },
  }
})

const post =
  vi.fn<(url: string, body: unknown, config?: AxiosRequestConfig) => Promise<{ data: unknown }>>()
const get = vi.fn<(url: string, config?: AxiosRequestConfig) => Promise<{ data: unknown }>>()

vi.mock('./apiClient', () => ({
  default: {
    post: (url: string, body: unknown, config?: AxiosRequestConfig) => post(url, body, config),
    get: (url: string, config?: AxiosRequestConfig) => get(url, config),
  },
}))

const {
  postQuery,
  postNonClinicalQuery,
  getNonClinicalImageIds,
  interpretFilters,
  submitDatasetOnDemand,
  pollDatasetOnDemandStatus,
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

describe('interpretFilters', () => {
  beforeEach(() => {
    post.mockReset()
    post.mockResolvedValue({ data: { interpretation: 'Male', filters: [] } })
  })

  it('posts only the query text to /ai/filters, without requestedScope', async () => {
    await interpretFilters('male', new AbortController().signal)
    expect(post.mock.calls[0]?.[0]).toBe('/ai/filters')
    expect(post.mock.calls[0]?.[1]).toEqual({ query: 'male' })
  })

  it('passes the abort signal and a 75 second timeout', async () => {
    const { signal } = new AbortController()
    await interpretFilters('male', signal)
    expect(post.mock.calls[0]?.[2]).toEqual({ signal, timeout: 75_000 })
  })

  it('returns the response body', async () => {
    await expect(interpretFilters('male', new AbortController().signal)).resolves.toEqual({
      interpretation: 'Male',
      filters: [],
    })
  })
})

describe('submitDatasetOnDemand', () => {
  beforeEach(() => {
    vi.mocked(axios.post).mockReset()
  })

  it('posts image_accessions and user to VITE_DOD_ENDPOINT_URL with withCredentials: false', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      status: 200,
      data: { on_demand_dataset_accession: 'SDA-abc' },
    })
    await submitDatasetOnDemand(['img-1', 'img-2'])
    expect(vi.mocked(axios.post)).toHaveBeenCalledWith(
      import.meta.env.VITE_DOD_ENDPOINT_URL,
      { image_accessions: ['img-1', 'img-2'], user: 'placeholder' },
      expect.objectContaining({ withCredentials: false }),
    )
  })

  it('returns success result with onDemandDatasetAccession on 200', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      status: 200,
      data: { on_demand_dataset_accession: 'SDA-abc' },
    })
    const result = await submitDatasetOnDemand(['img-1'])
    expect(result).toEqual({ status: 'success', onDemandDatasetAccession: 'SDA-abc' })
  })

  it('returns processing result with onDemandDatasetAccession on 202', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      status: 202,
      data: { on_demand_dataset_accession: 'SDA-abc' },
    })
    const result = await submitDatasetOnDemand(['img-1'])
    expect(result).toEqual({ status: 'processing', onDemandDatasetAccession: 'SDA-abc' })
  })

  it('throws ApiError-shaped object on axios error', async () => {
    const axiosError = Object.assign(new Error('Server error'), {
      isAxiosError: true,
      response: {
        status: 500,
        statusText: 'Internal Server Error',
        data: { title: 'Server error', detail: 'Something broke' },
      },
    })
    vi.mocked(axios.post).mockRejectedValue(axiosError)
    await expect(submitDatasetOnDemand(['img-1'])).rejects.toMatchObject({
      status: 500,
      title: 'Server error',
      detail: 'Something broke',
    })
  })
})

describe('pollDatasetOnDemandStatus', () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockReset()
  })

  it('GETs {VITE_DOD_ENDPOINT_URL}/{accession}/status', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { status: 'STATUS_CREATING' } })
    await pollDatasetOnDemandStatus('SDA-abc')
    expect(vi.mocked(axios.get)).toHaveBeenCalledWith(
      `${import.meta.env.VITE_DOD_ENDPOINT_URL}/SDA-abc/status`,
      expect.objectContaining({ withCredentials: false }),
    )
  })

  it('returns STATUS_CREATING from response', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { status: 'STATUS_CREATING' } })
    expect(await pollDatasetOnDemandStatus('SDA-abc')).toBe('STATUS_CREATING')
  })

  it('returns STATUS_RELEASED from response', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { status: 'STATUS_RELEASED' } })
    expect(await pollDatasetOnDemandStatus('SDA-abc')).toBe('STATUS_RELEASED')
  })

  it('returns STATUS_INVALID from response', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { status: 'STATUS_INVALID' } })
    expect(await pollDatasetOnDemandStatus('SDA-abc')).toBe('STATUS_INVALID')
  })
})
