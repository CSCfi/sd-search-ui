<script setup lang="ts">
import { computed, ref } from 'vue'
import { Link, Loader, RotateCcw, Search } from '@lucide/vue'
import DynamicField from '@/components/dynamic/DynamicField.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import { useFilteringTerms } from '@/composables/query/useFilteringTerms'
import { useSearchStore } from '@/stores/searchStore'
import { useResolvedGroups } from '@/composables/query/useResolvedGroups'
import type { ResolvedGroup } from '@/types/config'
import { useFilteringScopes } from '@/composables/query/useFilteringScopes'
import { fieldsConfig } from '@/services/config'
import { useContentConfig } from '@/composables/ui/useContentConfig'
import type { BeaconFilteringTerm } from '@/types/beacon'

const { search } = useContentConfig()

const {
  data: filteringTerms,
  isLoading: isFilteringTermsLoading,
  isError: isFilteringTermsError,
} = useFilteringTerms()
const { groups } = useResolvedGroups()
const {
  data: filteringScopes,
  isLoading: isFilteringScopesLoading,
  isError: isFilteringScopesError,
} = useFilteringScopes()

const store = useSearchStore()

const copied = ref(false)

// All scope ids from the API, regardless of hidden_scopes. Used to determine whether a
// field is truly shared (present in every backend scope), so that hiding a scope does not
// accidentally promote scope-specific fields into the shared grid above the tabs.
const allScopeIds = computed(() => (filteringScopes.value ?? []).map((s) => s.id))

// A field is shared only if it exists in every scope, so it belongs above the tabs.
// Uses allScopeIds (unfiltered) so hidden scopes don't affect the shared/scoped split.
// This relies on the loading guard below: when the scope list is empty, `every()` would
// otherwise treat every field as shared.
const isShared = (field: BeaconFilteringTerm) =>
  allScopeIds.value.every((id) => field.scopes.includes(id))

const groupedFields = computed(() => groups.value)

// Header fields are excluded from the grid — they render above the tabs via ObservationTypeSelector.
const isHeaderField = (field: BeaconFilteringTerm) => fieldsConfig.header.includes(field.id)

const sharedGroups = computed(() =>
  groupedFields.value
    .map((group) => ({
      ...group,
      fields: group.fields.filter((f) => isShared(f) && !isHeaderField(f)),
    }))
    .filter((group) => group.fields.length > 0),
)

// Shared group borders come from fieldsConfig.bordered
const groupClass = (group: ResolvedGroup) => ({
  'group--border': fieldsConfig.bordered.includes(group.id),
})

async function copySearch() {
  const params = new URLSearchParams(
    store.draftFilters.map((f) => [f.id, Array.isArray(f.value) ? f.value.join(',') : f.value]),
  )
  if (store.datasetType !== 'all') params.set('tab', store.datasetType)
  if (store.includeComplementary) params.set('complementary', 'true')
  const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`
  try {
    await navigator.clipboard.writeText(url)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // clipboard API unavailable (non-HTTPS non-localhost)
  }
}
</script>

<template>
  <section class="search-form">
    <div
      v-if="isFilteringTermsLoading || isFilteringScopesLoading"
      class="state-loading"
      aria-live="polite"
      aria-label="Loading filters"
    >
      <Loader :size="24" class="spinner" aria-hidden="true" />
    </div>

    <p v-else-if="isFilteringTermsError || isFilteringScopesError" class="state-error" role="alert">
      Service is currently unavailable. Please try again later.
    </p>

    <form v-else-if="filteringTerms && filteringScopes" class="form-content" @submit.prevent>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <p class="filter-hint" v-html="search.filterHintHtml" />
      <div v-for="group in sharedGroups" :key="group.id" class="group" :class="groupClass(group)">
        <h2 class="group-label">{{ group.label }}</h2>
        <div class="fields-grid">
          <DynamicField
            v-for="field in group.fields"
            :key="field.id"
            :field="field"
            :class="{ 'col-span-3': field.type === 'text' }"
          />
        </div>
      </div>

      <slot name="scope-section" />

      <div v-if="fieldsConfig.complementary === true" class="complementary-card">
        <ToggleSwitch
          input-id="include-complementary-toggle"
          :model-value="store.includeComplementary"
          aria-labelledby="include-complementary-label"
          @update:model-value="store.setIncludeComplementary"
        />
        <div class="complementary-text">
          <span id="include-complementary-label" class="complementary-title">
            Search also for complementary data
          </span>
          <span class="complementary-description">
            Include annotations, observations and images that complement the matching datasets.
          </span>
        </div>
        <span
          class="complementary-status"
          aria-hidden="true"
          :class="{ 'complementary-status--on': store.includeComplementary }"
        >
          {{ store.includeComplementary ? 'ON' : 'OFF' }}
        </span>
      </div>

      <div class="form-actions">
        <c-button class="btn-search" type="submit" @click="store.commit()">
          <Search :size="16" aria-hidden="true" />
          Search
        </c-button>
        <c-button class="btn-clear" ghost @click="store.clearFilters()">
          <RotateCcw :size="16" aria-hidden="true" />
          Clear search
        </c-button>
        <c-button
          class="btn-copy"
          ghost
          :disabled="store.draftFilters.length === 0"
          @click="copySearch"
        >
          <Link :size="16" aria-hidden="true" />
          {{ copied ? 'Copied!' : 'Copy filter URL' }}
        </c-button>
      </div>
    </form>
  </section>
</template>

<style scoped lang="scss">
.search-form {
  background-color: var(--color-dark-blue);
  padding: 2rem 1.5rem;
  color: var(--color-white);
}

.state-loading {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
}

.state-error {
  padding: 3rem 0;
  color: var(--color-white);
  text-align: center;
}

.filter-hint {
  margin-bottom: 1.5rem;
  border-left: 3px solid rgb(var(--color-scope-clinical-rgb) / 0.6);
  padding-left: 0.75rem;
  max-width: 100%;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9375rem;
  line-height: 1.5;

  @include tablet {
    max-width: 50%;
  }
}

.group {
  padding-top: 1.5rem;
}

.group--border {
  margin-top: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 0.5rem;
  background-color: rgba(255, 255, 255, 0.06);
  padding: 1.25rem 1.5rem;
}

.group-label {
  margin-bottom: 0.75rem;
  color: var(--color-white);
  font-size: 1rem;
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

.complementary-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  background-color: rgba(255, 255, 255, 0.06);
  padding: 1rem 1.25rem;
}

.complementary-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.complementary-title {
  color: var(--color-white);
  font-weight: 700;
  font-size: 0.9375rem;
}

.complementary-description {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8125rem;
  line-height: 1.4;
}

.complementary-status {
  flex-shrink: 0;
  border-radius: 9999px;
  background-color: rgba(255, 255, 255, 0.15);
  padding: 0.25rem 0.75rem;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 700;
  font-size: 0.6875rem;
  letter-spacing: 0.06em;

  &--on {
    background-color: var(--color-pink);
    color: var(--color-white);
  }
}

.btn-search {
  --c-button-background-color: var(--color-pink);
  --c-button-background-color-hover: #ff2567;
  --c-button-text-color: var(--color-white);
  --c-button-loader-color: transparent;

  &:focus-within {
    outline: 2px solid var(--color-pink);
    outline-offset: 2px;
  }
}

.btn-clear,
.btn-copy {
  --c-button-background-color: transparent;
  --c-button-outlined-text-color: var(--color-white);
  --c-button-outlined-border-color: var(--color-white);
  --c-button-outlined-background-color-hover: rgba(255, 255, 255, 0.1);
  --c-button-outlined-loader-color: transparent;

  svg {
    fill: none !important;
  }

  &:focus-within {
    outline: 2px solid var(--color-pink);
    outline-offset: 2px;
  }
}

.btn-copy {
  transition: opacity 0.2s ease;

  &[disabled] {
    opacity: 0.4;
  }
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

    .col-span-3 {
      grid-column: 1 / -1;
    }
  }
}

@include desktop-small {
  .search-form {
    padding: 2.5rem;
  }

  .fields-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
