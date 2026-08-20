<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSearchStore } from '@/stores/searchStore'
import { useFilteringTerms } from '@/composables/useFilteringTerms'
import { useClinicalSearch } from '@/composables/useClinicalSearch'
import { useNonClinicalSearch } from '@/composables/useNonClinicalSearch'
import { pluralize } from '@/utils/pluralize.ts'

const { committedFilters, hasCommittedFilters, committedDatasetType } =
  storeToRefs(useSearchStore())
const { data: filteringTermsData } = useFilteringTerms()
const { data: clinicalData } = useClinicalSearch()
const { data: nonClinicalData } = useNonClinicalSearch()

const clinicalCount = computed(() => clinicalData.value?.responseSummary.numTotalResults)
const nonClinicalCount = computed(() => nonClinicalData.value?.responseSummary.numTotalResults)

const labelMap = computed<Map<string, string>>(() => {
  const terms = filteringTermsData.value ?? []
  return new Map(terms.map((t) => [t.id, t.label]))
})

function fieldLabel(id: string): string {
  return labelMap.value.get(id) ?? id
}

function displayValue(filter: { value: string | string[]; label?: string[] }): string {
  if (filter.label && filter.label.length > 0) return filter.label.join(', ')
  return Array.isArray(filter.value) ? filter.value.join(', ') : filter.value
}

const resultCountText = computed<string | null>(() => {
  if (committedDatasetType.value === 'clinical') {
    return clinicalCount.value !== undefined
      ? `${pluralize(clinicalCount.value, 'dataset', 'datasets')} found`
      : null
  }
  if (committedDatasetType.value === 'non_clinical') {
    return nonClinicalCount.value !== undefined
      ? `${pluralize(nonClinicalCount.value, 'image', 'images')} found`
      : null
  }

  const parts: string[] = []
  if (clinicalCount.value !== undefined)
    parts.push(pluralize(clinicalCount.value, 'clinical dataset', 'clinical datasets'))
  if (nonClinicalCount.value !== undefined)
    parts.push(pluralize(nonClinicalCount.value, 'non-clinical image', 'non-clinical images'))
  return parts.length > 0 ? parts.join(' · ') : null
})
</script>

<template>
  <div v-if="hasCommittedFilters" class="results-banner" aria-label="Active filters">
    <span class="banner-label">Active filters:</span>
    <ul class="filter-tags" role="list">
      <li v-for="filter in committedFilters" :key="filter.id" class="filter-tag">
        <span class="tag-id">{{ fieldLabel(filter.id) }}</span>
        <span class="tag-sep">:</span>
        <span class="tag-value">{{ displayValue(filter) }}</span>
      </li>
    </ul>
    <p v-if="resultCountText" class="result-count" aria-live="polite">{{ resultCountText }}</p>
  </div>
</template>

<style scoped>
.results-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
}

.banner-label {
  color: var(--color-text);
  font-weight: var(--font-weight-heading);
  font-size: 0.875rem;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.filter-tag {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid var(--color-light-grey);
  border-radius: 9999px;
  background-color: var(--color-white);
  padding: 0.2rem 0.625rem;
  color: var(--color-text);
  font-size: 0.8125rem;
}

.tag-id {
  color: var(--color-dark-blue);
  font-weight: var(--font-weight-heading);
  font-size: 0.75rem;
}

.tag-sep {
  color: var(--color-text-secondary);
}

.tag-value {
  color: var(--color-text);
}

.result-count {
  flex-basis: 100%;
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
}
</style>
