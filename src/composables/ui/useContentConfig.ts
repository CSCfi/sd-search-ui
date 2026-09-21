import { contentConfig } from '@service/content'
import type { ContentConfig } from '@/types/content'

export function useContentConfig(): ContentConfig {
  return contentConfig
}
