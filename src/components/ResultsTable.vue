<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Search } from '@lucide/vue'
import { useSearchStore } from '@/stores/searchStore'
import { useSearch } from '@/composables/useSearch'
import type { BeaconResultSetResult } from '@/types/beacon'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import ErrorBanner from '@/components/ui/ErrorBanner.vue'
import DescriptionModal from '@/components/DescriptionModal.vue'

const { hasCommittedFilters } = storeToRefs(useSearchStore())
const { data, isLoading, isError } = useSearch()

const errorDismissed = ref(false)

const flatResults = computed<BeaconResultSetResult[]>(
  () => data.value?.response.resultSet.flatMap((rs) => rs.results) ?? [],
)

const isEmpty = computed(
  () =>
    data.value !== undefined &&
    (data.value.responseSummary.numTotalResults === 0 || flatResults.value.length === 0),
)

function truncate(text: string | null, max: number): string {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '…' : text
}

function requestAccess(datasetId: string) {
  window.open(
    `https://bp-rems.sd.csc.fi/apply-for?resource=${datasetId}`,
    '_blank',
    'noopener,noreferrer',
  )
}

const modalOpen = ref(false)
const activeResult = ref<BeaconResultSetResult | null>(null)
const triggerRefs = ref<HTMLButtonElement[]>([])
const activeTriggerIndex = ref<number>(-1)

function openModal(result: BeaconResultSetResult, index: number) {
  activeResult.value = result
  activeTriggerIndex.value = index
  modalOpen.value = true
}

async function onModalClose(open: boolean) {
  modalOpen.value = open
  if (!open && activeTriggerIndex.value >= 0) {
    await nextTick()
    triggerRefs.value[activeTriggerIndex.value]?.focus()
  }
}
</script>

<template>
  <div v-if="!hasCommittedFilters" class="no-filters-state" aria-live="polite">
    <Search :size="40" class="no-filters-icon" aria-hidden="true" />
    <h2 class="no-filters-heading">Start by selecting filters</h2>
    <p class="no-filters-subtext">
      Select one or more filters above and click Search to find datasets.
    </p>
  </div>

  <section v-else class="results-table-section" aria-label="Search results" aria-live="polite">
    <LoadingSpinner v-if="isLoading" :size="24" />

    <ErrorBanner
      v-else-if="isError && !errorDismissed"
      message="Search failed. Please try again."
      @dismiss="errorDismissed = true"
    />

    <p v-else-if="isEmpty" class="empty-state">No results found.</p>

    <div v-else class="table-wrapper">
      <table class="results-table">
        <caption class="sr-only">
          Search results
        </caption>
        <thead>
          <tr>
            <th scope="col">Title</th>
            <th scope="col">Description</th>
            <th scope="col">Images</th>
            <th scope="col"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(result, index) in flatResults" :key="result.datasetId">
            <td class="col-title">{{ result.datasetTitle ?? result.datasetId }}</td>
            <td class="col-description">
              <span>{{ truncate(result.datasetDescription, 80) }}</span>
              <button
                v-if="result.datasetDescription && result.datasetDescription.length > 80"
                :ref="
                  (el) => {
                    if (el) triggerRefs[index] = el as HTMLButtonElement
                  }
                "
                class="show-more-btn"
                @click="openModal(result, index)"
              >
                Show more
              </button>
            </td>
            <td class="col-images" aria-label="Matching images">
              {{ result.matchingImageCount }} / {{ result.totalImageCount }}
            </td>
            <td class="col-action">
              <c-button
                variant="outlined"
                class="btn-access"
                :aria-label="`Request access for ${result.datasetTitle ?? result.datasetId}`"
                @click="requestAccess(result.datasetId)"
              >
                Request access
              </c-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <DescriptionModal
      v-model="modalOpen"
      :title="activeResult?.datasetTitle ?? activeResult?.datasetId ?? ''"
      :description="activeResult?.datasetDescription ?? ''"
      @update:model-value="onModalClose"
    />
  </section>
</template>

<style scoped>
.no-filters-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 4rem 1.5rem;
  text-align: center;
  color: var(--color-text-secondary);
}

.no-filters-icon {
  color: var(--color-light-grey);
}

.no-filters-heading {
  font-size: 1.25rem;
  font-weight: var(--font-weight-heading);
  color: var(--color-dark-blue);
  margin: 0;
}

.no-filters-subtext {
  font-size: 0.9375rem;
  color: var(--color-text-secondary);
  margin: 0;
  max-width: 32rem;
}

.results-table-section {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.empty-state {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 3rem 0;
  margin: 0;
}

.table-wrapper {
  overflow-x: auto;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
  color: var(--color-text);
}

.results-table thead th {
  text-align: left;
  padding: 0.75rem 1rem;
  border-bottom: 2px solid var(--color-light-grey);
  font-weight: var(--font-weight-heading);
  color: var(--color-dark-blue);
  white-space: nowrap;
}

.results-table tbody tr {
  border-bottom: 1px solid var(--color-light-grey);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: var(--color-surface);
  }
}

.results-table tbody td {
  padding: 0.875rem 1rem;
  vertical-align: top;
}

.col-title {
  font-weight: var(--font-weight-subheading);
  color: var(--color-dark-blue);
  min-width: 10rem;
}

.col-description {
  color: var(--color-text);
  max-width: 24rem;
}

.col-images {
  white-space: nowrap;
  color: var(--color-text-secondary);
}

.col-action {
  white-space: nowrap;
}

.show-more-btn {
  display: inline;
  background: none;
  border: none;
  padding: 0;
  margin-left: 0.25rem;
  color: var(--color-bright-blue);
  font-size: 0.875rem;
  font-family: var(--font-family);
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--color-pink);
    outline-offset: 2px;
    border-radius: 2px;
  }
}

.btn-access {
  color: var(--color-dark-blue);
  border-color: var(--color-dark-blue);

  &:focus-within {
    outline: 2px solid var(--color-pink);
    outline-offset: 2px;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
