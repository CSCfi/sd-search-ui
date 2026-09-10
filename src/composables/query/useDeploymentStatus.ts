import { useQuery } from '@tanstack/vue-query'
import { getStatus } from '@/services/api'
import type { DeploymentStatus } from '@/types/beacon'

const FIVE_MINUTES = 5 * 60 * 1000

export function useDeploymentStatus() {
  return useQuery<DeploymentStatus>({
    queryKey: ['deploymentStatus'],
    queryFn: getStatus,
    staleTime: FIVE_MINUTES,
    refetchInterval: FIVE_MINUTES,
  })
}
