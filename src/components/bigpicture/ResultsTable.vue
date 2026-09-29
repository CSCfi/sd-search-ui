<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ChevronDown, Key, Search } from '@lucide/vue'
import { useSearchStore } from '@/stores/searchStore'
import { useClinicalSearch } from '@/composables/query/useClinicalSearch'
import { useFilteringScopes } from '@/composables/query/useFilteringScopes'
import { pluralize } from '@/utils/pluralize'
import { buildRemsUrl } from '@/utils/rems'
import { complementaryContentLabels } from '@/utils/complementaryContent'
import type { BigPictureDatasetResult, RelatedDataset } from '@/types/bigpicture'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import ErrorBanner from '@/components/ui/ErrorBanner.vue'
import DescriptionModal from '@/components/DescriptionModal.vue'

const {
  hasCommittedFilters,
  committedFilters,
  committedDatasetType,
  committedIncludeComplementary,
} = storeToRefs(useSearchStore())
const { data, isLoading, isError } = useClinicalSearch()
const { data: filteringScopes } = useFilteringScopes()

const clinicalLabel = computed(
  () => filteringScopes.value?.find((scope) => scope.id === 'clinical')?.label + ' results',
)

const isActiveTab = computed(
  () => committedDatasetType.value === 'all' || committedDatasetType.value === 'clinical',
)

const clinicalCount = computed(() => data.value?.responseSummary.numTotalResults)

const countHeading = computed(() => {
  if (clinicalCount.value === undefined) return null
  return pluralize(clinicalCount.value, 'clinical dataset', 'clinical datasets')
})

const errorDismissed = ref(false)
const selectedDatasetRows = ref<Set<string>>(new Set())

const collapsedPrimaryIds = ref<Set<string>>(new Set())

watch(committedFilters, () => {
  selectedDatasetRows.value = new Set()
})

function isPanelExpanded(primaryDatasetId: string): boolean {
  return !collapsedPrimaryIds.value.has(primaryDatasetId)
}

function togglePanel(primaryDatasetId: string) {
  const next = new Set(collapsedPrimaryIds.value)
  if (next.has(primaryDatasetId)) {
    next.delete(primaryDatasetId)
  } else {
    next.add(primaryDatasetId)
  }
  collapsedPrimaryIds.value = next
}

const selectedCount = computed(() => selectedDatasetRows.value.size)
const selectedIdsArray = computed(() => Array.from(selectedDatasetRows.value))

const flatResults = computed<BigPictureDatasetResult[]>(
  () =>
    data.value?.response.resultSet.flatMap((rs) => rs.results as BigPictureDatasetResult[]) ?? [],
)

const isEmpty = computed(
  () =>
    data.value !== undefined &&
    (data.value.responseSummary.numTotalResults === 0 || flatResults.value.length === 0),
)

function complements(result: BigPictureDatasetResult): RelatedDataset[] {
  return result.relatedDatasets?.filter((rd) => rd.relationType === 'complementary') ?? []
}

// A complementary dataset may be linked to multiple primary datasets. This lookup ensures it is
// removed from the selection only when none of its linked primary datasets remain selected.
const complementOwners = computed(() => {
  const owners = new Map<string, Set<string>>()
  for (const primary of flatResults.value) {
    for (const complement of complements(primary)) {
      const set = owners.get(complement.datasetId) ?? new Set<string>()
      set.add(primary.datasetId)
      owners.set(complement.datasetId, set)
    }
  }
  return owners
})

function truncate(text: string | null, max: number): string {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '…' : text
}

function requestAccess(result: BigPictureDatasetResult) {
  const selectedComplementIds = complements(result)
    .map((c) => c.datasetId)
    .filter((id) => selectedDatasetRows.value.has(id))
  window.open(
    buildRemsUrl([result.datasetId, ...selectedComplementIds]),
    '_blank',
    'noopener,noreferrer',
  )
}

function openBulkRems(ids: string[]) {
  window.open(buildRemsUrl(ids), '_blank', 'noopener,noreferrer')
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

// Deselecting a primary drops its complements from the selection too, unless the same
// complementary id is still owned by another primary that remains selected (see
// complementOwners above).
function togglePrimarySelection(result: BigPictureDatasetResult) {
  const wasSelected = isSelected(result.datasetId)
  toggleSelection(result.datasetId)
  if (!wasSelected) return

  const ownedComplementIds = complements(result).map((c) => c.datasetId)
  if (ownedComplementIds.length === 0) return

  const next = new Set(selectedDatasetRows.value)
  for (const complementId of ownedComplementIds) {
    const owners = complementOwners.value.get(complementId) ?? new Set<string>()
    const stillOwned = Array.from(owners).some(
      (ownerId) => ownerId !== result.datasetId && selectedDatasetRows.value.has(ownerId),
    )
    if (!stillOwned) next.delete(complementId)
  }
  selectedDatasetRows.value = next
}

function isPrimarySelected(primaryDatasetId: string): boolean {
  return isSelected(primaryDatasetId)
}

const modalOpen = ref(false)
const activeResult = ref<BigPictureDatasetResult | null>(null)
const triggerRefs = ref<HTMLButtonElement[]>([])
const activeTriggerIndex = ref<number>(-1)

function openModal(result: BigPictureDatasetResult, index: number) {
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
  <template v-if="isActiveTab">
    <h2 v-if="hasCommittedFilters" class="scope-heading scope-heading--clinical">
      {{ clinicalLabel }}
      <span v-if="countHeading" class="scope-heading-count">{{ countHeading }}</span>
    </h2>

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
              <template v-for="(result, index) in flatResults" :key="result.datasetId">
                <tr
                  :class="{
                    'primary-row--panel-open':
                      committedIncludeComplementary &&
                      complements(result).length > 0 &&
                      isPanelExpanded(result.datasetId),
                  }"
                >
                  <td class="col-select">
                    <input
                      type="checkbox"
                      :checked="isSelected(result.datasetId)"
                      :id="`select-${result.datasetId}`"
                      :aria-label="`Select ${result.datasetTitle ?? result.datasetId}`"
                      @change="togglePrimarySelection(result)"
                    />
                  </td>
                  <td class="col-title">
                    {{ result.datasetTitle ?? result.datasetId }}
                    <button
                      v-if="committedIncludeComplementary && complements(result).length > 0"
                      type="button"
                      class="complement-toggle"
                      :aria-expanded="isPanelExpanded(result.datasetId)"
                      :aria-controls="`complement-panel-${result.datasetId}`"
                      @click="togglePanel(result.datasetId)"
                    >
                      <ChevronDown
                        :size="14"
                        class="complement-toggle-icon"
                        :class="{
                          'complement-toggle-icon--collapsed': !isPanelExpanded(result.datasetId),
                        }"
                        aria-hidden="true"
                      />
                      {{
                        pluralize(
                          complements(result).length,
                          'complementary dataset',
                          'complementary datasets',
                        )
                      }}
                    </button>
                  </td>
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
                      @click="requestAccess(result)"
                    >
                      Request access
                    </c-button>
                  </td>
                </tr>
                <tr
                  v-if="
                    committedIncludeComplementary &&
                    complements(result).length > 0 &&
                    isPanelExpanded(result.datasetId)
                  "
                  class="complement-panel-row"
                >
                  <td class="complement-panel-cell" colspan="6">
                    <div :id="`complement-panel-${result.datasetId}`" class="complement-panel">
                      <table class="complement-table">
                        <caption class="sr-only">
                          Complementary datasets for
                          {{
                            result.datasetTitle ?? result.datasetId
                          }}
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col"><span class="sr-only">Select</span></th>
                            <th scope="col">Complementary dataset</th>
                            <th scope="col">Description</th>
                            <th scope="col">Complementary content</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="complement in complements(result)"
                            :key="`${result.datasetId}-${complement.datasetId}`"
                            class="complement-row"
                          >
                            <td class="complement-col-select">
                              <input
                                type="checkbox"
                                :checked="isSelected(complement.datasetId)"
                                :disabled="!isPrimarySelected(result.datasetId)"
                                :id="`select-${result.datasetId}-${complement.datasetId}`"
                                :aria-label="`Select complementary dataset ${complement.datasetTitle ?? complement.datasetId}`"
                                :aria-describedby="
                                  !isPrimarySelected(result.datasetId)
                                    ? 'complement-disabled-hint'
                                    : undefined
                                "
                                @change="toggleSelection(complement.datasetId)"
                              />
                            </td>
                            <td class="complement-col-title">
                              <label :for="`select-${result.datasetId}-${complement.datasetId}`">
                                {{ complement.datasetTitle ?? complement.datasetId }}
                              </label>
                            </td>
                            <td class="complement-col-description">
                              {{ truncate(complement.datasetDescription, 90) }}
                            </td>
                            <td class="complement-col-type">
                              <template
                                v-if="complementaryContentLabels(complement.resourceTypes).length"
                              >
                                <span
                                  v-for="label in complementaryContentLabels(
                                    complement.resourceTypes,
                                  )"
                                  :key="label"
                                  class="resource-type-pill"
                                >
                                  {{ label }}
                                </span>
                              </template>
                              <span v-else class="resource-type-pill resource-type-pill--empty">
                                Not specified
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>

      <span id="complement-disabled-hint" class="sr-only"> Select the primary dataset first </span>

      <DescriptionModal
        v-model="modalOpen"
        :title="activeResult?.datasetTitle ?? activeResult?.datasetId ?? ''"
        :description="activeResult?.datasetDescription ?? ''"
        @update:model-value="onModalClose"
      />
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

.scope-heading--clinical {
  color: rgb(var(--color-scope-clinical-rgb));

  &::before {
    background: rgb(var(--color-scope-clinical-rgb));
  }
}

.scope-heading-count {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-body);
  font-size: 0.8125rem;
  letter-spacing: normal;
  text-transform: none;

  &::before {
    margin-right: 0.375rem;
    content: '·';
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
  /* This controls the maximum height of the results container until scrollbars become visible.
   * This is 10 visible dataset rows
   */
  max-height: 50rem;
  overflow-x: hidden;
  overflow-y: auto;
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

  > thead > tr > th {
    border-bottom: 2px solid var(--color-light-grey);
    padding: 0.75rem 1rem;
    color: var(--color-dark-blue);
    font-weight: var(--font-weight-heading);
    text-align: left;
    white-space: nowrap;
  }

  > tbody {
    > tr {
      border-bottom: 1px solid var(--color-light-grey);

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background-color: var(--color-surface);
      }
    }

    > tr.primary-row--panel-open {
      border-bottom: none;
    }

    > tr > td {
      vertical-align: top;
      padding: 0.875rem 1rem;
    }
  }
}

.results-table > tbody > tr.complement-panel-row:hover {
  background-color: transparent;
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

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
}

.col-title {
  min-width: 10rem;
  color: var(--color-dark-blue);
  font-weight: var(--font-weight-subheading);
}

.complement-toggle {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  margin-top: 0.25rem;
  border: none;
  background: none;
  padding: 0;
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-body);
  font-size: 0.8125rem;
  font-family: var(--font-family);

  &:hover {
    color: var(--color-dark-blue);
  }

  &:focus-visible {
    outline: 2px solid var(--color-pink);
    outline-offset: 2px;
    border-radius: 2px;
  }
}

.complement-toggle-icon {
  flex-shrink: 0;
  transition: transform 0.15s ease;

  &--collapsed {
    transform: rotate(-90deg);
  }
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

.complement-panel-cell {
  padding: 0 1rem 1rem !important;
}

.complement-panel {
  border-radius: 0.5rem;
  background-color: rgb(var(--color-scope-clinical-rgb) / 0.06);
  overflow: hidden;
}

.complement-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.875rem;

  thead th {
    border-bottom: 1px solid rgb(var(--color-scope-clinical-rgb) / 0.12);
    padding: 0.625rem 1rem;
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-heading);
    font-size: 0.75rem;
    letter-spacing: 0.03em;
    text-align: left;
    text-transform: uppercase;
    white-space: nowrap;
  }

  tbody td {
    vertical-align: top;
    padding: 0.625rem 1rem;
  }

  tbody tr:not(:last-child) td {
    border-bottom: 1px solid rgb(var(--color-scope-clinical-rgb) / 0.12);
  }
}

.complement-col-select {
  width: 1px;

  input[type='checkbox'] {
    cursor: pointer;
    width: 1.125rem;
    height: 1.125rem;
    accent-color: var(--color-dark-blue);

    &:focus-visible {
      outline: 2px solid var(--color-pink);
      outline-offset: 2px;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
}

.complement-col-title {
  min-width: 10rem;
  color: var(--color-text);
  font-weight: var(--font-weight-subheading);

  label {
    cursor: pointer;
  }
}

.complement-col-description {
  max-width: 24rem;
  color: var(--color-text);
}

.complement-col-type {
  white-space: nowrap;
}

.resource-type-pill {
  display: inline-block;
  margin: 0 0.25rem 0.25rem 0;
  border-radius: 0.25rem;
  background-color: var(--color-light-grey);
  padding: 0.125rem 0.5rem;
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
}

.resource-type-pill--empty {
  background-color: transparent;
  padding-left: 0;
  font-style: italic;
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
</style>
