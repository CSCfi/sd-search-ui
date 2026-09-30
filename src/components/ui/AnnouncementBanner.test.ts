import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { AnnouncementConfig } from '@/types/content'

const state = vi.hoisted(() => ({ announcement: undefined as AnnouncementConfig | undefined }))

vi.mock('@/composables/ui/useContentConfig', () => ({
  useContentConfig: () => ({ announcement: state.announcement }),
}))

import AnnouncementBanner from './AnnouncementBanner.vue'

const EMPTY: AnnouncementConfig = {}

const BASE: AnnouncementConfig = {
  ...EMPTY,
  id: 'a1',
  html: '<p>Maintenance <a href="#">details</a></p>',
}

function mountBanner(announcement?: AnnouncementConfig) {
  state.announcement = announcement
  return mount(AnnouncementBanner)
}

describe('AnnouncementBanner', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('renders nothing without an announcement', () => {
    expect(mountBanner().find('.announcement').exists()).toBe(false)
  })

  it('renders nothing when no fields are set', () => {
    expect(mountBanner(EMPTY).find('.announcement').exists()).toBe(false)
  })

  it('renders the message html', () => {
    const wrapper = mountBanner(BASE)
    expect(wrapper.text()).toContain('Maintenance')
    expect(wrapper.find('a').exists()).toBe(true)
  })

  it('applies the variant class', () => {
    const wrapper = mountBanner({ ...BASE, variant: 'warning' })
    expect(wrapper.find('.announcement--warning').exists()).toBe(true)
  })

  it('hides before startsAt and after endsAt', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'))
    expect(
      mountBanner({ ...BASE, startsAt: '2026-07-01T00:00:00Z' })
        .find('.announcement')
        .exists(),
    ).toBe(false)
    expect(
      mountBanner({ ...BASE, endsAt: '2026-06-01T00:00:00Z' })
        .find('.announcement')
        .exists(),
    ).toBe(false)
    expect(
      mountBanner({ ...BASE, startsAt: '2026-06-01T00:00:00Z', endsAt: '2026-07-01T00:00:00Z' })
        .find('.announcement')
        .exists(),
    ).toBe(true)
  })

  it('dismisses and persists per id', async () => {
    const wrapper = mountBanner(BASE)
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('.announcement').exists()).toBe(false)

    expect(mountBanner(BASE).find('.announcement').exists()).toBe(false)
    expect(
      mountBanner({ ...BASE, id: 'a2' })
        .find('.announcement')
        .exists(),
    ).toBe(true)
  })

  it('hides the dismiss button when dismissible is false', () => {
    const wrapper = mountBanner({ ...BASE, dismissible: false })
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
