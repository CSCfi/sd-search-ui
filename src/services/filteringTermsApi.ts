import type { BeaconFilteringTermsResponse } from '@/types/beacon'
import api from './api'

export async function fetchFilteringTerms(): Promise<BeaconFilteringTermsResponse> {
  return api.get<BeaconFilteringTermsResponse>('/filtering_terms').then((r) => r.data)
}
