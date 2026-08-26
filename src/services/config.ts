import fieldsConfigRaw from '@/configs/fields.yaml'

export interface FieldsConfig {
  hidden: string[]
  hidden_description: string[]
  bordered: string[]
}

export const fieldsConfig: FieldsConfig = fieldsConfigRaw as unknown as FieldsConfig
