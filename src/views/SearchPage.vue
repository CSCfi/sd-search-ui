<script setup lang="ts">
import { useRoute } from 'vue-router'
import SearchForm from '@/components/SearchForm.vue'
import ResultsBanner from '@/components/ResultsBanner.vue'
import ResultsTable from '@/components/ResultsTable.vue'
import { useSearchStore } from '@/stores/searchStore'
import { useResolveUrlLabels } from '@/composables/useResolveUrlLabels'
import type { BeaconQueryFilter } from '@/types/beacon'

const route = useRoute()
const store = useSearchStore()
const { resolveLabelsFromUrl } = useResolveUrlLabels()

function parseFilterValue(raw: string): string | string[] {
  return raw.includes(',') ? raw.split(',') : raw
}

const entries = Object.entries(route.query)

const parsed: BeaconQueryFilter[] = []

for (const [id, raw] of entries) {
  if (typeof raw !== 'string' || raw === '') continue
  parsed.push({
    id,
    value: parseFilterValue(raw),
    operator: '=',
    includeDescendantTerms: true,
  })
}

if (parsed.length > 0) {
  store.initFromUrl(parsed)
  resolveLabelsFromUrl(parsed)
}
</script>

<template>
  <main class="search-layout">
    <section class="filters">
      <div class="section-inner">
        <h1 class="title">Discover digital pathology sets</h1>
        <div class="filters-wrapper">
          <SearchForm />
        </div>
      </div>
    </section>
    <section class="results">
      <div class="section-inner">
        <ResultsBanner />
        <ResultsTable />
      </div>
    </section>
  </main>
</template>

<style scoped lang="scss">
.search-layout {
  flex: 1;

  .filters {
    background-color: var(--color-dark-blue);
    color: var(--color-white);
  }

  .section-inner {
    @include container;
  }

  .title {
    padding-top: 3rem;
    color: var(--color-white);
    font-weight: var(--font-weight-heading);
    font-size: 1.5rem;
    text-align: center;
  }
}

@include tablet {
  .search-layout {
    .title {
      font-size: 1.875rem;
    }
  }
}
</style>
