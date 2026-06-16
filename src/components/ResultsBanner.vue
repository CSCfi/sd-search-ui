<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSearchStore } from '@/stores/searchStore'
import { useFilteringTerms } from '@/composables/useFilteringTerms'

const { committedFilters, hasCommittedFilters } = storeToRefs(useSearchStore())
const { data: filteringTermsData } = useFilteringTerms()

const labelMap = computed<Map<string, string>>(() => {
  const terms = filteringTermsData.value?.response.filteringTerms ?? []
  return new Map(terms.map((t) => [t.id, t.label]))
})

function fieldLabel(id: string): string {
  return labelMap.value.get(id) ?? id
}

function displayValue(filter: { value: string | string[]; label?: string[] }): string {
  if (filter.label && filter.label.length > 0) return filter.label.join(', ')
  return Array.isArray(filter.value) ? filter.value.join(', ') : filter.value
}
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
  font-weight: var(--font-weight-heading);
  font-size: 0.875rem;
  color: var(--color-text);
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.filter-tag {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background-color: var(--color-white);
  border: 1px solid var(--color-light-grey);
  border-radius: 9999px;
  padding: 0.2rem 0.625rem;
  font-size: 0.8125rem;
  color: var(--color-text);
}

.tag-id {
  font-weight: var(--font-weight-heading);
  color: var(--color-dark-blue);
  font-size: 0.75rem;
}

.tag-sep {
  color: var(--color-text-secondary);
}

.tag-value {
  color: var(--color-text);
}
</style>
