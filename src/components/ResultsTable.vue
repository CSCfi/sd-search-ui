<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Key, Search } from '@lucide/vue'
import { useSearchStore } from '@/stores/searchStore'
import { useSearch } from '@/composables/useSearch'
import type { BeaconResultSetResult } from '@/types/beacon'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import ErrorBanner from '@/components/ui/ErrorBanner.vue'
import DescriptionModal from '@/components/DescriptionModal.vue'

const { hasCommittedFilters, committedFilters } = storeToRefs(useSearchStore())
const { data, isLoading, isError } = useSearch()

const errorDismissed = ref(false)
const selectedDatasetRows = ref<Set<string>>(new Set())

watch(committedFilters, () => {
  selectedDatasetRows.value = new Set()
})

const selectedCount = computed(() => selectedDatasetRows.value.size)
const selectedIdsArray = computed(() => Array.from(selectedDatasetRows.value))

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

function openBulkRems(ids: string[]) {
  const url = new URL('https://bp-rems.sd.csc.fi/apply-for')
  ids.forEach((id) => url.searchParams.append('resource', id))
  window.open(url.toString(), '_blank', 'noopener,noreferrer')
}

function isSelected(id: string): boolean {
  return selectedDatasetRows.value.has(id)
}

function toggleSelection(id: string) {
  const next = new Set(selectedDatasetRows.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedDatasetRows.value = next
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

    <div v-else class="results-container">
      <Transition name="bulk-bar">
        <div
          v-if="selectedCount > 0"
          class="bulk-action-bar"
          role="region"
          aria-label="Bulk actions"
        >
          <span class="bulk-count">{{ selectedCount }} selected</span>
          <c-button
            class="btn-bulk-access"
            :aria-label="`Apply for access to ${selectedCount} selected datasets`"
            @click="openBulkRems(selectedIdsArray)"
          >
            <Key :size="16" aria-hidden="true" />
            Apply for access ({{ selectedCount }})
          </c-button>
        </div>
      </Transition>
      <div class="table-wrapper">
        <table class="results-table">
          <caption class="sr-only">
            Search results
          </caption>
          <thead>
            <tr>
              <th scope="col"><span class="sr-only">Select row</span></th>
              <th scope="col">Title</th>
              <th scope="col">Description</th>
              <th scope="col">More details</th>
              <th scope="col">Matching images</th>
              <th scope="col"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(result, index) in flatResults" :key="result.datasetId">
              <td class="col-select">
                <input
                  type="checkbox"
                  :checked="isSelected(result.datasetId)"
                  :id="`select-${result.datasetId}`"
                  :aria-label="`Select ${result.datasetTitle ?? result.datasetId}`"
                  @change="toggleSelection(result.datasetId)"
                />
              </td>
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
                  :aria-label="`Show full description for ${result.datasetTitle ?? result.datasetId}`"
                  @click="openModal(result, index)"
                >
                  Show more
                </button>
              </td>
              <td class="col-more-details">
                <a
                  v-if="result.datasetUrl"
                  :href="result.datasetUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  :aria-label="`View details for ${result.datasetTitle ?? result.datasetId} (opens in new tab)`"
                >
                  View Details
                </a>
              </td>
              <td class="col-images" aria-label="Matching images">
                {{ result.matchingImageCount }} / {{ result.totalImageCount }}
              </td>
              <td class="col-action">
                <c-button
                  ghost
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

.results-table-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
}

.empty-state {
  margin: 0;
  padding: 3rem 0;
  color: var(--color-text-secondary);
  text-align: center;
}

.results-container {
  position: relative;
  max-height: calc(100vh - 32rem);
  overflow-x: hidden;
  overflow-y: auto;
}

.bulk-bar-enter-active,
.bulk-bar-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.25s ease-out;
}

.bulk-bar-enter-from,
.bulk-bar-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.bulk-action-bar {
  display: flex;
  position: sticky;
  top: 0;
  justify-content: flex-end;
  align-items: center;
  gap: 1rem;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  background: #fff;
  padding: 0.75rem 1rem;
}

.bulk-count {
  color: var(--color-dark-blue);
  font-weight: var(--font-weight-subheading);
}

.btn-bulk-access {
  --c-button-background-color: var(--color-dark-blue);
  --c-button-background-color-hover: #2d0099;
  --c-button-text-color: var(--color-white);
  --c-button-loader-color: transparent;
  --c-button-outline-color: var(--color-pink);
  color: var(--color-white);
}

.table-wrapper {
  overflow-x: auto;
}

.results-table {
  border-collapse: collapse;
  width: 100%;
  color: var(--color-text);
  font-size: 0.9375rem;
}

.results-table thead th {
  border-bottom: 2px solid var(--color-light-grey);
  padding: 0.75rem 1rem;
  color: var(--color-dark-blue);
  font-weight: var(--font-weight-heading);
  text-align: left;
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
  vertical-align: top;
  padding: 0.875rem 1rem;
}

.col-select {
  input[type='checkbox'] {
    cursor: pointer;
    width: 1.125rem;
    height: 1.125rem;
    accent-color: var(--color-dark-blue);

    &:focus-visible {
      outline: 2px solid var(--color-pink);
      outline-offset: 2px;
    }
  }
}

.col-title {
  min-width: 10rem;
  color: var(--color-dark-blue);
  font-weight: var(--font-weight-subheading);
}

.col-description {
  max-width: 24rem;
  color: var(--color-text);
}

.col-images {
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.col-action {
  white-space: nowrap;
}

.show-more-btn {
  display: inline;
  cursor: pointer;
  margin-left: 0.25rem;
  border: none;
  background: none;
  padding: 0;
  color: var(--color-bright-blue);
  font-size: 0.875rem;
  font-family: var(--font-family);

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
  border-color: var(--color-dark-blue);
  color: var(--color-dark-blue);

  &:focus-within {
    outline: 2px solid var(--color-pink);
    outline-offset: 2px;
  }
}

.sr-only {
  position: absolute;
  margin: -1px;
  padding: 0;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
  white-space: nowrap;
}
</style>
