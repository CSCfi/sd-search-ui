<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import { fieldsConfig } from '@/services/config'
import type { BeaconFilteringTerm } from '@/types/beacon'
import TextInput from './TextField.vue'
import MultiSelect from './MultiSelect.vue'
import OntologyPicker from './OntologyPicker.vue'
import RangePicker from './RangePicker.vue'

const props = defineProps<{
  field: BeaconFilteringTerm
}>()

const store = useSearchStore()

const currentFilter = computed(() => store.draftFilters.find((f) => f.id === props.field.id))

const currentStringValue = computed(() => {
  const value = currentFilter.value?.value
  return typeof value === 'string' ? value : ''
})

const currentArrayValue = computed(() => {
  const value = currentFilter.value?.value
  if (Array.isArray(value)) return value
  return value ? [value] : []
})

const ontologyDisplayLabels = ref<string[]>([])

const ONTOLOGY_TYPES: BeaconFilteringTerm['type'][] = ['ontology', 'ontologyOrValue']

function handleStringUpdate(value: string) {
  store.setFilter(props.field.id, value)
}

function handleArrayUpdate(value: string[]) {
  store.setFilter(props.field.id, value)
}

function handleOntologyUpdate(value: string[]) {
  const includeDescendantTerms = ONTOLOGY_TYPES.includes(props.field.type) ? true : undefined
  const labels = ontologyDisplayLabels.value.length > 0 ? ontologyDisplayLabels.value : undefined
  store.setFilter(props.field.id, value, labels, includeDescendantTerms)
}

function handleDisplayLabels(labels: string[]) {
  ontologyDisplayLabels.value = labels
}

const showConceptId = computed(() => (fieldsConfig.show_concept_id ?? []).includes(props.field.id))

const KNOWN_TYPES: BeaconFilteringTerm['type'][] = [
  'text',
  'keyword',
  'controlledValue',
  'ontology',
  'ontologyOrValue',
  'iso8601Range',
]

onMounted(() => {
  if (!KNOWN_TYPES.includes(props.field.type)) {
    console.warn(
      `[DynamicField] Unknown field type "${props.field.type}" for field "${props.field.id}"`,
    )
  }
})
</script>

<template>
  <TextInput
    v-if="field.type === 'text'"
    :label="field.label"
    :field-id="field.id"
    :description="field.description"
    :model-value="currentStringValue"
    @update:model-value="handleStringUpdate"
  />

  <MultiSelect
    v-else-if="field.type === 'controlledValue'"
    :label="field.label"
    :field-id="field.id"
    :description="field.description"
    :model-value="currentArrayValue"
    :controlled-values="field.controlledValues"
    @update:model-value="handleArrayUpdate"
  />

  <OntologyPicker
    v-else-if="field.type === 'ontology'"
    :label="field.label"
    :field-id="field.id"
    :description="field.description"
    :model-value="currentArrayValue"
    :allow-free-text="false"
    :show-concept-id="showConceptId"
    @update:model-value="handleOntologyUpdate"
    @update:display-labels="handleDisplayLabels"
  />

  <OntologyPicker
    v-else-if="field.type === 'ontologyOrValue' || field.type === 'keyword'"
    :label="field.label"
    :field-id="field.id"
    :description="field.description"
    :model-value="currentArrayValue"
    :allow-free-text="true"
    :show-concept-id="showConceptId"
    @update:model-value="handleOntologyUpdate"
    @update:display-labels="handleDisplayLabels"
  />

  <RangePicker
    v-else-if="field.type === 'iso8601Range'"
    :label="field.label"
    :field-id="field.id"
    :description="field.description"
    :model-value="currentStringValue"
    @update:model-value="handleStringUpdate"
  />
</template>
