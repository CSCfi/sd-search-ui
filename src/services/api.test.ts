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

const post = vi.fn<(url: string, body: BeaconQueryRequest) => Promise<{ data: unknown }>>()
const get = vi.fn<(url: string, config?: AxiosRequestConfig) => Promise<{ data: unknown }>>()

vi.mock('./apiClient', () => ({
  default: {
    post: (url: string, body: BeaconQueryRequest) => post(url, body),
    get: (url: string, config?: AxiosRequestConfig) => get(url, config),
  },
}))

const {
  postQuery,
  postNonClinicalQuery,
  getFieldValues,
  getSuggestions,
  getNonClinicalImageIds,
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
