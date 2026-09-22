import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildRemsUrl } from './rems'

const REMS_BASE = 'https://test-rems.example.com'

describe('buildRemsUrl', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_REMS_URL', REMS_BASE)
  })

  it('constructs REMS apply-for URL from single accession string', () => {
    expect(buildRemsUrl('SDA-abc')).toBe(`${REMS_BASE}/apply-for?resource=SDA-abc`)
  })

  it('constructs REMS apply-for URL with multiple resource params from array', () => {
    expect(buildRemsUrl(['SDA-abc', 'SDA-def'])).toBe(
      `${REMS_BASE}/apply-for?resource=SDA-abc&resource=SDA-def`,
    )
  })

  it('handles single-element array same as string', () => {
    expect(buildRemsUrl(['SDA-abc'])).toBe(`${REMS_BASE}/apply-for?resource=SDA-abc`)
  })
})
