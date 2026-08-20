<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Key } from '@lucide/vue'
import { useSearchStore } from '@/stores/searchStore'
import { useNonClinicalSearch } from '@/composables/useNonClinicalSearch'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import ErrorBanner from '@/components/ui/ErrorBanner.vue'

const { committedDatasetType, hasCommittedFilters } = storeToRefs(useSearchStore())
const { data, isLoading, isError } = useNonClinicalSearch()

const errorDismissed = ref(false)

const isActiveTab = computed(
  () => committedDatasetType.value === 'all' || committedDatasetType.value === 'non_clinical',
)

const imageCount = computed(() => data.value?.responseSummary.numTotalResults ?? 0)

const hasMatches = computed(() => data.value !== undefined && imageCount.value > 0)

function applyForNonClinicalAccess() {
  // TODO: the count-granularity response carries no imageIds, so there
  // is nothing to send to the access request endpoint yet.
}
</script>

<template>
  <section
    v-if="isActiveTab && hasCommittedFilters"
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
          <span class="nc-bar nc-bar--empty" aria-hidden="true"></span>
          <p class="nc-heading nc-heading--empty">No matching non-clinical images</p>
        </div>

        <template v-else-if="hasMatches">
          <div class="nc-row">
            <span class="nc-bar nc-bar--active" aria-hidden="true"></span>
            <p class="nc-heading">
              Matching non-clinical images : <span class="nc-count">{{ imageCount }}</span>
            </p>
          </div>
          <c-button class="btn-apply-non-clinical" @click="applyForNonClinicalAccess">
            <Key :size="16" aria-hidden="true" />
            Apply for the non-clinical images
          </c-button>
          <p class="nc-disclaimer">
            Image access is subject to approval. You will receive an email when your virtual dataset
            is ready.
          </p>
        </template>
      </template>
    </div>
  </section>
</template>

<style scoped>
.non-clinical-results {
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

.nc-bar {
  flex-shrink: 0;
  border-radius: 0.125rem;
  width: 0.25rem;
  height: 1.75rem;
}

.nc-bar--empty {
  background: var(--color-light-grey);
}

.nc-bar--active {
  background: rgb(var(--color-scope-non-clinical-rgb));
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
</style>
