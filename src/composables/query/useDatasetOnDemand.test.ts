import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { useSearchStore } from '@/stores/searchStore'

const getNonClinicalImageIds = vi.fn<(...args: unknown[]) => Promise<string[]>>()
const submitDatasetOnDemand = vi.fn<(...args: unknown[]) => Promise<void>>()

vi.mock('@/services/api', () => ({
  getNonClinicalImageIds: (...args: unknown[]) => getNonClinicalImageIds(...args),
  submitDatasetOnDemand: (...args: unknown[]) => submitDatasetOnDemand(...args),
}))

const { useDatasetOnDemand } = await import('./useDatasetOnDemand')

describe('useDatasetOnDemand', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getNonClinicalImageIds.mockReset()
    submitDatasetOnDemand.mockReset()

    // Seed a committed filter so committedFilters is non-empty
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.commit()
  })

  it('submits exactly the ids from getNonClinicalImageIds once and ends in sent', async () => {
    getNonClinicalImageIds.mockResolvedValue(['img-a', 'img-b', 'img-c'])
    submitDatasetOnDemand.mockResolvedValue(undefined)

    const { dodStatus, applyForNonClinicalImages } = useDatasetOnDemand()
    const promise = applyForNonClinicalImages()
    expect(dodStatus.value).toBe('loading')
    await promise

    expect(submitDatasetOnDemand).toHaveBeenCalledOnce()
    expect(submitDatasetOnDemand).toHaveBeenCalledWith(['img-a', 'img-b', 'img-c'])
    expect(dodStatus.value).toBe('sent')
  })

  it('goes to error state when submitDatasetOnDemand rejects', async () => {
    getNonClinicalImageIds.mockResolvedValue(['img-1'])
    submitDatasetOnDemand.mockRejectedValue(new Error('Request failed'))

    const { dodStatus, applyForNonClinicalImages } = useDatasetOnDemand()
    await applyForNonClinicalImages()

    expect(dodStatus.value).toBe('error')
  })

  it('shows an access-denied message when submit is rejected with 401', async () => {
    getNonClinicalImageIds.mockResolvedValue(['img-1'])
    submitDatasetOnDemand.mockRejectedValue({ status: 401, title: 'unauthenticated' })

    const { dodStatus, dodError, applyForNonClinicalImages } = useDatasetOnDemand()
    await applyForNonClinicalImages()

    expect(dodStatus.value).toBe('error')
    expect(dodError.value).toBe('Your account does not have access to non-clinical images.')
  })

  it('goes to error state when getNonClinicalImageIds resolves to empty array', async () => {
    getNonClinicalImageIds.mockResolvedValue([])

    const { dodStatus, applyForNonClinicalImages } = useDatasetOnDemand()
    await applyForNonClinicalImages()

    expect(dodStatus.value).toBe('error')
    expect(submitDatasetOnDemand).not.toHaveBeenCalled()
  })

  it('clears dodError and submits again on retry after error', async () => {
    getNonClinicalImageIds.mockResolvedValue(['img-1'])
    submitDatasetOnDemand.mockRejectedValueOnce({
      status: 500,
      title: 'Error',
      detail: 'First failure',
    })

    const { dodStatus, dodError, applyForNonClinicalImages } = useDatasetOnDemand()
    await applyForNonClinicalImages()
    expect(dodStatus.value).toBe('error')
    expect(dodError.value).toBe('First failure')

    submitDatasetOnDemand.mockResolvedValue(undefined)
    const retry = applyForNonClinicalImages()
    expect(dodStatus.value).toBe('loading')
    expect(dodError.value).toBeNull()
    await retry

    expect(submitDatasetOnDemand).toHaveBeenCalledTimes(2)
    expect(dodStatus.value).toBe('sent')
  })

  it('ignores a second application while the first application is loading', async () => {
    let resolveImageIds!: (imageIds: string[]) => void
    getNonClinicalImageIds.mockReturnValueOnce(
      new Promise<string[]>((resolve) => {
        resolveImageIds = resolve
      }),
    )
    submitDatasetOnDemand.mockResolvedValue(undefined)

    const { applyForNonClinicalImages } = useDatasetOnDemand()
    const firstApplication = applyForNonClinicalImages()
    const secondApplication = applyForNonClinicalImages()

    expect(getNonClinicalImageIds).toHaveBeenCalledOnce()

    resolveImageIds(['img-1'])
    await Promise.all([firstApplication, secondApplication])

    expect(submitDatasetOnDemand).toHaveBeenCalledOnce()
  })

  it('does not submit again after the request was sent', async () => {
    getNonClinicalImageIds.mockResolvedValue(['img-1'])
    submitDatasetOnDemand.mockResolvedValue(undefined)

    const { dodStatus, applyForNonClinicalImages } = useDatasetOnDemand()
    await applyForNonClinicalImages()
    await applyForNonClinicalImages()

    expect(dodStatus.value).toBe('sent')
    expect(getNonClinicalImageIds).toHaveBeenCalledOnce()
    expect(submitDatasetOnDemand).toHaveBeenCalledOnce()
  })

  it('goes back to idle when the committed filter values change after sent', async () => {
    getNonClinicalImageIds.mockResolvedValue(['img-1'])
    submitDatasetOnDemand.mockResolvedValue(undefined)

    const { dodStatus, applyForNonClinicalImages } = useDatasetOnDemand()
    await applyForNonClinicalImages()
    expect(dodStatus.value).toBe('sent')

    const store = useSearchStore()
    store.setFilter('sex', 'Male')
    store.commit()
    await flushPromises()

    expect(dodStatus.value).toBe('idle')
  })

  it('stays sent when the same filters are committed again', async () => {
    getNonClinicalImageIds.mockResolvedValue(['img-1'])
    submitDatasetOnDemand.mockResolvedValue(undefined)

    const { dodStatus, applyForNonClinicalImages } = useDatasetOnDemand()
    await applyForNonClinicalImages()

    useSearchStore().commit()
    await flushPromises()

    expect(dodStatus.value).toBe('sent')
  })

  it('goes to idle, not sent, when the filters change while the request is in flight', async () => {
    let resolveImageIds!: (imageIds: string[]) => void
    getNonClinicalImageIds.mockReturnValueOnce(
      new Promise<string[]>((resolve) => {
        resolveImageIds = resolve
      }),
    )
    submitDatasetOnDemand.mockResolvedValue(undefined)

    const { dodStatus, applyForNonClinicalImages } = useDatasetOnDemand()
    const application = applyForNonClinicalImages()

    const store = useSearchStore()
    store.setFilter('sex', 'Male')
    store.commit()

    resolveImageIds(['img-1'])
    await application

    expect(dodStatus.value).toBe('idle')
  })

  it('does not change status after its component is unmounted mid-request', async () => {
    let resolveImageIds!: (imageIds: string[]) => void
    getNonClinicalImageIds.mockReturnValueOnce(
      new Promise<string[]>((resolve) => {
        resolveImageIds = resolve
      }),
    )
    submitDatasetOnDemand.mockResolvedValue(undefined)

    let composable!: ReturnType<typeof useDatasetOnDemand>
    const wrapper = mount(
      defineComponent({
        setup() {
          composable = useDatasetOnDemand()
          return () => null
        },
      }),
    )

    const application = composable.applyForNonClinicalImages()
    wrapper.unmount()
    resolveImageIds(['img-1'])
    await application

    expect(submitDatasetOnDemand).not.toHaveBeenCalled()
    expect(composable.dodStatus.value).toBe('loading')
  })
})
