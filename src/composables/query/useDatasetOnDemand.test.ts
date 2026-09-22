import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSearchStore } from '@/stores/searchStore'

const getNonClinicalImageIds = vi.fn<(...args: unknown[]) => Promise<string[]>>()
const submitDatasetOnDemand = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const pollDatasetOnDemandStatus = vi.fn<(...args: unknown[]) => Promise<string>>()
const buildRemsUrl = vi.fn<(...args: unknown[]) => string>()

vi.mock('@/services/api', () => ({
  getNonClinicalImageIds: (...args: unknown[]) => getNonClinicalImageIds(...args),
  submitDatasetOnDemand: (...args: unknown[]) => submitDatasetOnDemand(...args),
  pollDatasetOnDemandStatus: (...args: unknown[]) => pollDatasetOnDemandStatus(...args),
}))

vi.mock('@/utils/rems', () => ({
  buildRemsUrl: (...args: unknown[]) => buildRemsUrl(...args),
}))

const { useDatasetOnDemand } = await import('./useDatasetOnDemand')

describe('useDatasetOnDemand', () => {
  let windowOpenSpy: ReturnType<typeof vi.spyOn>

  afterEach(() => {
    windowOpenSpy?.mockRestore()
    vi.useRealTimers()
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    getNonClinicalImageIds.mockReset()
    submitDatasetOnDemand.mockReset()
    pollDatasetOnDemandStatus.mockReset()
    buildRemsUrl.mockReset()
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    // Seed a committed filter so committedFilters is non-empty
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.commit()
  })

  it('calls submitDatasetOnDemand with exactly the ids from getNonClinicalImageIds', async () => {
    vi.useFakeTimers()
    getNonClinicalImageIds.mockResolvedValue(['img-a', 'img-b', 'img-c'])
    submitDatasetOnDemand.mockResolvedValue({
      status: 'success',
      onDemandDatasetAccession: 'SDA-abc',
    })
    pollDatasetOnDemandStatus.mockResolvedValue('STATUS_RELEASED')
    buildRemsUrl.mockReturnValue('https://rems.example.com/apply-for?resource=SDA-abc')

    const { applyForNonClinicalImages } = useDatasetOnDemand()
    const promise = applyForNonClinicalImages()
    await vi.advanceTimersByTimeAsync(3000)
    await promise

    expect(submitDatasetOnDemand).toHaveBeenCalledWith(['img-a', 'img-b', 'img-c'])
  })

  it('goes to error state when submitDatasetOnDemand rejects', async () => {
    getNonClinicalImageIds.mockResolvedValue(['img-1'])
    submitDatasetOnDemand.mockRejectedValue(new Error('Request failed'))

    const { dodStatus, applyForNonClinicalImages } = useDatasetOnDemand()
    await applyForNonClinicalImages()

    expect(dodStatus.value).toBe('error')
  })

  it('goes to error state when getNonClinicalImageIds resolves to empty array', async () => {
    getNonClinicalImageIds.mockResolvedValue([])

    const { dodStatus, applyForNonClinicalImages } = useDatasetOnDemand()
    await applyForNonClinicalImages()

    expect(dodStatus.value).toBe('error')
    expect(submitDatasetOnDemand).not.toHaveBeenCalled()
  })

  it('clears dodError and re-enters loading on retry after error', async () => {
    vi.useFakeTimers()
    getNonClinicalImageIds.mockResolvedValue(['img-1'])
    submitDatasetOnDemand.mockRejectedValue({
      status: 500,
      title: 'Error',
      detail: 'First failure',
    })

    const { dodStatus, dodError, applyForNonClinicalImages } = useDatasetOnDemand()
    await applyForNonClinicalImages()
    expect(dodStatus.value).toBe('error')
    expect(dodError.value).toBe('First failure')

    submitDatasetOnDemand.mockResolvedValue({
      status: 'success',
      onDemandDatasetAccession: 'SDA-abc',
    })
    pollDatasetOnDemandStatus.mockResolvedValue('STATUS_RELEASED')
    buildRemsUrl.mockReturnValue('https://rems.example.com/apply-for?resource=SDA-abc')

    const promise = applyForNonClinicalImages()
    expect(dodStatus.value).toBe('loading')
    expect(dodError.value).toBeNull()

    await vi.advanceTimersByTimeAsync(3000)
    await promise

    expect(getNonClinicalImageIds).toHaveBeenCalledTimes(2)
    expect(submitDatasetOnDemand).toHaveBeenCalledTimes(2)
    expect(dodStatus.value).toBe('idle')
  })
})

describe('useDatasetOnDemand — polling', () => {
  let windowOpenSpy: ReturnType<typeof vi.spyOn>

  afterEach(() => {
    windowOpenSpy?.mockRestore()
    vi.useRealTimers()
  })

  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    getNonClinicalImageIds.mockReset()
    submitDatasetOnDemand.mockReset()
    pollDatasetOnDemandStatus.mockReset()
    buildRemsUrl.mockReset()
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.commit()
  })

  it('goes loading → polling → idle and opens REMS URL on STATUS_RELEASED', async () => {
    getNonClinicalImageIds.mockResolvedValue(['img-1', 'img-2'])
    submitDatasetOnDemand.mockResolvedValue({
      status: 'success',
      onDemandDatasetAccession: 'SDA-abc',
    })
    pollDatasetOnDemandStatus.mockResolvedValue('STATUS_RELEASED')
    buildRemsUrl.mockReturnValue('https://rems.example.com/apply-for?resource=SDA-abc')

    const { dodStatus, applyForNonClinicalImages } = useDatasetOnDemand()
    expect(dodStatus.value).toBe('idle')

    const promise = applyForNonClinicalImages()
    expect(dodStatus.value).toBe('loading')

    await vi.advanceTimersByTimeAsync(3000)
    await promise

    expect(dodStatus.value).toBe('idle')
    expect(pollDatasetOnDemandStatus).toHaveBeenCalledWith('SDA-abc')
    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://rems.example.com/apply-for?resource=SDA-abc',
      '_blank',
      'noopener',
    )
  })

  it('polls multiple times before STATUS_RELEASED', async () => {
    getNonClinicalImageIds.mockResolvedValue(['img-1'])
    submitDatasetOnDemand.mockResolvedValue({
      status: 'success',
      onDemandDatasetAccession: 'SDA-abc',
    })
    pollDatasetOnDemandStatus
      .mockResolvedValueOnce('STATUS_CREATING')
      .mockResolvedValueOnce('STATUS_RELEASED')
    buildRemsUrl.mockReturnValue('https://rems.example.com/apply-for?resource=SDA-abc')

    const { dodStatus, applyForNonClinicalImages } = useDatasetOnDemand()
    const promise = applyForNonClinicalImages()

    await vi.advanceTimersByTimeAsync(6000) // two poll intervals
    await promise

    expect(dodStatus.value).toBe('idle')
    expect(pollDatasetOnDemandStatus).toHaveBeenCalledTimes(2)
    expect(windowOpenSpy).toHaveBeenCalledOnce()
  })

  it('goes to error state on STATUS_INVALID, does not open window', async () => {
    getNonClinicalImageIds.mockResolvedValue(['img-1'])
    submitDatasetOnDemand.mockResolvedValue({
      status: 'success',
      onDemandDatasetAccession: 'SDA-abc',
    })
    pollDatasetOnDemandStatus.mockResolvedValue('STATUS_INVALID')

    const { dodStatus, applyForNonClinicalImages } = useDatasetOnDemand()
    const promise = applyForNonClinicalImages()

    await vi.advanceTimersByTimeAsync(3000)
    await promise

    expect(dodStatus.value).toBe('error')
    expect(windowOpenSpy).not.toHaveBeenCalled()
  })

  it('goes to error with timeout message when max attempts reached without STATUS_RELEASED', async () => {
    getNonClinicalImageIds.mockResolvedValue(['img-1'])
    submitDatasetOnDemand.mockResolvedValue({
      status: 'success',
      onDemandDatasetAccession: 'SDA-abc',
    })
    pollDatasetOnDemandStatus.mockResolvedValue('STATUS_CREATING')

    const { dodStatus, dodError, applyForNonClinicalImages } = useDatasetOnDemand()
    const promise = applyForNonClinicalImages()

    await vi.advanceTimersByTimeAsync(3000 * 20) // POLL_MAX_ATTEMPTS = 20
    await promise

    expect(dodStatus.value).toBe('error')
    expect(dodError.value).toContain('taking longer than expected')
    expect(windowOpenSpy).not.toHaveBeenCalled()
  })

  it('enters polling state after submitDatasetOnDemand resolves', async () => {
    getNonClinicalImageIds.mockResolvedValue(['img-1'])
    submitDatasetOnDemand.mockResolvedValue({
      status: 'success',
      onDemandDatasetAccession: 'SDA-abc',
    })
    // Never resolves — keeps composable stuck in polling loop
    pollDatasetOnDemandStatus.mockReturnValue(new Promise(() => {}))

    const { dodStatus, applyForNonClinicalImages } = useDatasetOnDemand()
    applyForNonClinicalImages()

    // Flush microtasks: getNonClinicalImageIds + submitDatasetOnDemand both resolve.
    // dodStatus becomes 'polling'; the next await is the 3s setTimeout.
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(dodStatus.value).toBe('polling')
  })
})
