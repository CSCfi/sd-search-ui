import fieldsConfigRaw from '@service/fields.yaml'
import groupsConfigRaw from '@service/groups.yaml'
import type { FilteringGroup } from '@/types/config'

export interface FieldsConfig {
  header: string[]
  hidden: string[]
  hidden_description: string[]
  bordered: string[]
  hidden_scopes: string[]
  show_concept_id?: string[]
}

export const fieldsConfig: FieldsConfig = fieldsConfigRaw as unknown as FieldsConfig
export const groupsConfig: FilteringGroup[] = groupsConfigRaw as unknown as FilteringGroup[]
