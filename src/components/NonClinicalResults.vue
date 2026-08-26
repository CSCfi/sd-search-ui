<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Key, Search } from '@lucide/vue'
import { useSearchStore } from '@/stores/searchStore'
import { useNonClinicalSearch } from '@/composables/useNonClinicalSearch'
import { useFilteringScopes } from '@/composables/useFilteringScopes'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import ErrorBanner from '@/components/ui/ErrorBanner.vue'

const { committedDatasetType, hasCommittedFilters } = storeToRefs(useSearchStore())
const { data, isLoading, isError } = useNonClinicalSearch()
const { data: filteringScopes } = useFilteringScopes()

const nonClinicalLabel = computed(
  () => filteringScopes.value?.find((scope) => scope.id === 'non_clinical')?.label + ' results',
)

const errorDismissed = ref(false)

const isActiveTab = computed(
  () => committedDatasetType.value === 'all' || committedDatasetType.value === 'non_clinical',
)

// On the 'all' tab, ResultsTable already renders the shared "no filters" prompt —
// only render it here when non_clinical is the sole active scope, to avoid a duplicate.
const showNoFiltersPrompt = computed(
  () => !hasCommittedFilters.value && committedDatasetType.value === 'non_clinical',
)

const imageCount = computed(() => data.value?.responseSummary.numTotalResults ?? 0)

const hasMatches = computed(() => data.value !== undefined && imageCount.value > 0)

function applyForNonClinicalAccess() {
  // TODO: the count-granularity response carries no imageIds, so there
  // is nothing to send to the access request endpoint yet.
}
</script>

<template>
  <template v-if="isActiveTab">
    <h2 v-if="hasCommittedFilters" class="scope-heading scope-heading--non-clinical">
      {{ nonClinicalLabel }}
    </h2>

    <div v-if="showNoFiltersPrompt" class="no-filters-state" aria-live="polite">
      <Search :size="40" class="no-filters-icon" aria-hidden="true" />
      <h2 class="no-filters-heading">Start by selecting filters</h2>
      <p class="no-filters-subtext">
        Select one or more filters above and click Search to find datasets.
      </p>
    </div>

    <section
      v-if="hasCommittedFilters"
      class="non-clinical-results"
      aria-label="Non-clinical results"
      aria-live="polite"
    >
      <div class="non-clinical-card">
        <LoadingSpinner v-if="isLoading" :size="24" />

        <ErrorBanner
          v-else-if="isError && !errorDismissed"
          message="Search failed. Please try again."
          @dismiss="errorDismissed = true"
        />

        <template v-else>
          <div v-if="data && !hasMatches" class="nc-row">
            <p class="nc-heading nc-heading--empty">No matching non-clinical images</p>
          </div>

          <template v-else-if="hasMatches">
            <div class="nc-row">
              <p class="nc-heading">
                Matching non-clinical images : <span class="nc-count">{{ imageCount }}</span>
              </p>
            </div>
            <c-button class="btn-apply-non-clinical" @click="applyForNonClinicalAccess">
              <Key :size="16" aria-hidden="true" />
              Apply for the non-clinical images
            </c-button>
            <p class="nc-disclaimer">
              Image access is subject to approval. You will receive an email when your virtual
              dataset is ready.
            </p>
          </template>
        </template>
      </div>
    </section>
  </template>
</template>

<style scoped lang="scss">
.scope-heading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 1.5rem 0 0.5rem 1.5rem;
  font-weight: var(--font-weight-heading);
  font-size: 1.0625rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;

  &::before {
    display: inline-block;
    border-radius: 0.125rem;
    width: 0.25rem;
    height: 1.125rem;
    content: '';
  }
}

.scope-heading--non-clinical {
  color: rgb(var(--color-scope-non-clinical-rgb));

  &::before {
    background: rgb(var(--color-scope-non-clinical-rgb));
  }
}

.no-filters-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 4rem 1.5rem;
  color: var(--color-text-secondary);
  text-align: center;
}

.no-filters-icon {
  color: var(--color-light-grey);
}

.no-filters-heading {
  margin: 0;
  color: var(--color-dark-blue);
  font-weight: var(--font-weight-heading);
  font-size: 1.25rem;
}

.no-filters-subtext {
  margin: 0;
  max-width: 32rem;
  color: var(--color-text-secondary);
  font-size: 0.9375rem;
}

.non-clinical-results {
  margin-top: 1.5rem;
  margin-bottom: 2.5rem;
  margin-left: 1.5rem;
  max-width: 35rem;
}

.non-clinical-card {
  border: 1px solid var(--color-light-grey);
  border-radius: 0.5rem;
  background: var(--color-surface);
  padding: 1.75rem 2rem;
}

.nc-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nc-heading {
  margin: 0;
  color: var(--color-text);
  font-weight: var(--font-weight-heading);
  font-size: 1.0625rem;
}

.nc-heading--empty {
  color: var(--color-text-secondary);
}

.nc-count {
  color: var(--color-dark-blue);
}

.btn-apply-non-clinical {
  margin-top: 1.25rem;
  --c-button-background-color: var(--color-pink);
  --c-button-background-color-hover: #ff2567;
  --c-button-text-color: var(--color-white);
  --c-button-loader-color: transparent;

  &:focus-within {
    outline: 2px solid var(--color-pink);
    outline-offset: 2px;
  }
}

.nc-disclaimer {
  margin: 0.875rem 0 0;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  line-height: 1.5;
}

@include tablet {
  .scope-heading {
    margin-left: 0;
  }

  .non-clinical-results {
    margin-left: 0;
  }
}
</style>
