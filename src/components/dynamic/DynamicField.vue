<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import type { BeaconFilteringTerm } from '@/types/beacon'
import TextInput from './TextField.vue'
import MultiSelect from './MultiSelect.vue'
import OntologyPicker from './OntologyPicker.vue'
import RangePicker from './RangePicker.vue'

const props = defineProps<{
  field: BeaconFilteringTerm
}>()

const store = useSearchStore()

const currentStringValue = computed(() => {
  const f = store.filters.find((f) => f.id === props.field.id)
  if (!f) return ''
  return typeof f.value === 'string' ? f.value : ''
})

const currentArrayValue = computed(() => {
  const f = store.filters.find((f) => f.id === props.field.id)
  if (!f) return []
  return Array.isArray(f.value) ? f.value : []
})

// Tracked locally so unchecking before any selection is honoured on first pick
const includeDescendantTerms = ref(
  store.filters.find((f) => f.id === props.field.id)?.includeDescendantTerms ?? true,
)

function handleStringUpdate(value: string) {
  store.setFilter(props.field.id, value)
}

function handleArrayUpdate(value: string[]) {
  store.setFilter(props.field.id, value)
}

function handleOntologyUpdate(value: string[]) {
  store.setFilter(props.field.id, value, includeDescendantTerms.value)
}

function handleIncludeDescendants(include: boolean) {
  includeDescendantTerms.value = include
  if (currentArrayValue.value.length > 0) {
    store.setFilter(props.field.id, currentArrayValue.value, include)
  }
}

const KNOWN_TYPES: BeaconFilteringTerm['type'][] = [
  'text',
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
    :model-value="currentStringValue"
    @update:model-value="handleStringUpdate"
  />

  <MultiSelect
    v-else-if="field.type === 'controlledValue'"
    :label="field.label"
    :field-id="field.id"
    :model-value="currentArrayValue"
    @update:model-value="handleArrayUpdate"
  />

  <OntologyPicker
    v-else-if="field.type === 'ontology'"
    :label="field.label"
    :field-id="field.id"
    :model-value="currentArrayValue"
    :allow-free-text="false"
    @update:model-value="handleOntologyUpdate"
    @update:include-descendant-terms="handleIncludeDescendants"
  />

  <OntologyPicker
    v-else-if="field.type === 'ontologyOrValue'"
    :label="field.label"
    :field-id="field.id"
    :model-value="currentArrayValue"
    :allow-free-text="true"
    @update:model-value="handleOntologyUpdate"
    @update:include-descendant-terms="handleIncludeDescendants"
  />

  <RangePicker
    v-else-if="field.type === 'iso8601Range'"
    :label="field.label"
    :model-value="currentStringValue"
    @update:model-value="handleStringUpdate"
  />
</template>
