<script setup lang="ts">
import { Loader, RefreshCw, Search } from '@lucide/vue'
import DynamicField from '@/components/dynamic/DynamicField.vue'
import { useFilteringTerms } from '@/composables/useFilteringTerms'
import { useSearchStore } from '@/stores/searchStore'
import { useSearch } from '@/composables/useSearch.ts'

// TODO: remove when ResultsList is implemented — it will register the query. This is only to test query until implemented.
useSearch()

const { data, isLoading, isError } = useFilteringTerms()
const store = useSearchStore()
console.log(store.committedFilters, store.hasCommittedFilters)
</script>

<template>
  <section class="search-form">
    <div v-if="isLoading" class="state-loading" aria-live="polite" aria-label="Loading filters">
      <Loader :size="24" class="spinner" aria-hidden="true" />
    </div>

    <p v-else-if="isError" class="state-error" role="alert">
      Service is currently unavailable. Please try again later.
    </p>

    <form v-else-if="data" class="form-content" @submit.prevent>
      <div class="fields-grid">
        <DynamicField
          v-for="field in data.response.filteringTerms"
          :key="field.id"
          :field="field"
          :class="{ 'col-span-4': field.type === 'text' }"
        />
      </div>

      <div class="form-actions">
        <c-button class="btn-search" type="submit" @click="store.commit()">
          <Search :size="16" aria-hidden="true" />
          Search
        </c-button>
        <c-button class="btn-clear" variant="outlined" @click="store.clearFilters()">
          <RefreshCw :size="16" aria-hidden="true" />
          Clear search
        </c-button>
      </div>
    </form>
  </section>
</template>

<style scoped lang="scss">
.search-form {
  background-color: var(--color-dark-blue);
  color: var(--color-white);
  padding: 2rem 1.5rem;
}

.state-loading {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
}

.state-error {
  color: var(--color-white);
  text-align: center;
  padding: 3rem 0;
}

.fields-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1.5rem;
}

.btn-search {
  background-color: var(--color-pink);
  color: var(--color-white);

  &:hover {
    background-color: #ff2567;
  }
}

.btn-clear {
  color: var(--color-white);
  border-color: var(--color-white);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  animation: spin 1s linear infinite;
}

@include tablet {
  .fields-grid {
    grid-template-columns: repeat(2, 1fr);

    .col-span-4 {
      grid-column: 1 / -1;
    }
  }
}

@include desktop-small {
  .search-form {
    padding: 2.5rem;
  }

  .fields-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
