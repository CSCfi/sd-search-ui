<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Link, Loader, RotateCcw, Search } from '@lucide/vue'
import DynamicField from '@/components/dynamic/DynamicField.vue'
import FilterTabGroup from '@/components/filters/FilterTabGroup.vue'
import FilterTabPanel from '@/components/filters/FilterTabPanel.vue'
import QualifierSelector from '@/components/filters/QualifierSelector.vue'
import { useFilteringTerms } from '@/composables/useFilteringTerms'
import { serializeQualifiers, useSearchStore, type DatasetType } from '@/stores/searchStore'
import { useFilteringGroups } from '@/composables/useFilteringGroups.ts'
import { useFilteringScopes } from '@/composables/useFilteringScopes'
import { useFilteringQualifiers } from '@/composables/useFilteringQualifiers'
import { useFieldScopes } from '@/composables/useFieldScopes'
import { fieldsConfig } from '@/services/config'
import type { BeaconFilteringGroup, BeaconFilteringTerm } from '@/types/beacon'

const {
  data: filteringTerms,
  isLoading: isFilteringTermsLoading,
  isError: isFilteringTermsError,
} = useFilteringTerms()
const {
  data: filteringGroups,
  isLoading: isFilteringGroupsLoading,
  isError: isFilteringGroupsError,
} = useFilteringGroups()
const {
  data: filteringScopes,
  isLoading: isFilteringScopesLoading,
  isError: isFilteringScopesError,
} = useFilteringScopes()

// Qualifiers are optional: if this request fails, hide the selector and run searches
// without URL-restored qualifiers (the watcher below fails open).
const { data: filteringQualifiers, isError: isFilteringQualifiersError } = useFilteringQualifiers()
const { data: fieldScopes } = useFieldScopes()
const store = useSearchStore()

const copied = ref(false)
const announcement = ref('')

const scopes = computed(() => filteringScopes.value ?? [])
const scopeIds = computed(() => scopes.value.map((s) => s.id))

// A field is shared only if it exists in every scope, so it belongs above the tabs.
// This relies on the loading guard below: when the scope list is empty, `every()` would
// otherwise treat every field as shared.
const isShared = (field: BeaconFilteringTerm) =>
  scopeIds.value.every((id) => field.scopes.includes(id))

const fieldLabel = (id: string) => filteringTerms.value?.find((f) => f.id === id)?.label ?? id

const activeTab = computed<DatasetType>({
  get: () => store.datasetType,
  set: (type) => {
    // Filters for fields outside the new scope are dropped from the draft. Committed filters
    // are left alone, so the visible results keep matching the search that produced them.
    const dropped =
      type === 'all'
        ? []
        : store.draftFilters.filter((f) => {
            const fieldScope = fieldScopes.value?.get(f.id)
            return fieldScope !== undefined && !fieldScope.includes(type)
          })

    store.setDatasetType(type)

    if (dropped.length > 0) {
      store.removeFilters(dropped.map((f) => f.id))
      announcement.value = `${dropped.length} filter${
        dropped.length === 1 ? '' : 's'
      } removed, not available in this dataset type: ${dropped.map((f) => fieldLabel(f.id)).join(', ')}`
    } else {
      announcement.value = ''
    }
  },
})

// Reset stale `?tab=` values once scopes resolve. `immediate` also handles cached scopes.
watch(
  scopeIds,
  (ids) => {
    if (ids.length > 0 && store.datasetType !== 'all' && !ids.includes(store.datasetType)) {
      store.resetScope()
    }
  },
  { immediate: true },
)

// URL qualifiers remain draft-only until validated against the fetched metadata.
// Promote valid values to the active query; remove invalid values or values that cannot be
// validated because the optional metadata request failed. `immediate` handles cached metadata.
watch(
  [filteringQualifiers, isFilteringQualifiersError],
  ([qualifiers, isError]) => {
    const hasDraftQualifiers = Object.keys(store.draftQualifiers).length > 0

    if (isError) {
      if (hasDraftQualifiers) {
        store.resetQualifiers()
        announcement.value =
          'Qualifier filter from the link could not be checked and was removed from the search.'
      }
      return
    }

    if (!qualifiers || qualifiers.length === 0) return

    const validValues = new Map(qualifiers.map((q) => [q.id, q.values]))
    const isValid = Object.entries(store.draftQualifiers).every(
      ([id, value]) => validValues.get(id)?.includes(value) ?? false,
    )

    if (isValid) {
      store.commitQualifiers()
    } else {
      store.resetQualifiers()
      announcement.value =
        'Qualifier filter from the link is not recognised and was removed from the search.'
    }
  },
  { immediate: true },
)

const groupedFields = computed(() => {
  return (
    filteringGroups.value?.map((group) => ({
      ...group,
      fields: filteringTerms.value?.filter((field) => field.group === group.id) ?? [],
    })) ?? []
  )
})

const sharedGroups = computed(() =>
  groupedFields.value
    .map((group) => ({ ...group, fields: group.fields.filter(isShared) }))
    .filter((group) => group.fields.length > 0),
)

// Scope sections preserve filteringTerms order: root-group fields render flat, while
// child-group fields render in labelled subgroups. `kind` discriminates the two layouts.
type FlatSection = { kind: 'flat'; fields: BeaconFilteringTerm[] }
type SubgroupSection = {
  kind: 'subgroup'
  group: BeaconFilteringGroup
  fields: BeaconFilteringTerm[]
}
type ScopeSection = FlatSection | SubgroupSection

const scopedSections = (scope: string): ScopeSection[] => {
  const sections: ScopeSection[] = []
  const groups = filteringGroups.value ?? []

  for (const field of filteringTerms.value ?? []) {
    if (isShared(field) || !field.scopes.includes(scope)) continue

    const group = groups.find((g) => g.id === field.ui_group)
    if (!group) continue

    if (group.parent) {
      // Append to the current subgroup if it's the same group; otherwise start a new one.
      const last = sections.at(-1)
      if (last?.kind === 'subgroup' && last.group.id === group.id) {
        last.fields.push(field)
      } else {
        sections.push({ kind: 'subgroup', group, fields: [field] })
      }
    } else {
      // Merge into current flat segment if adjacent; otherwise start a new one.
      const last = sections.at(-1)
      if (last?.kind === 'flat') {
        last.fields.push(field)
      } else {
        sections.push({ kind: 'flat', fields: [field] })
      }
    }
  }

  return sections
}

// Precomputed per scope to avoid calling scopedSections multiple times per render cycle.
const scopePanelSections = computed(() =>
  scopes.value.map((scope) => ({ scope, sections: scopedSections(scope.id) })),
)

const scopeGroupHasBorder = (scope: string) => fieldsConfig.bordered.includes(scope)

// Shared group borders come from fieldsConfig.bordered
const groupClass = (group: BeaconFilteringGroup) => ({
  'group--border': fieldsConfig.bordered.includes(group.id),
})

const subgroupClass = (group: BeaconFilteringGroup) => ({
  'subgroup--border': fieldsConfig.bordered.includes(group.id),
})

async function copySearch() {
  const params = new URLSearchParams(
    store.draftFilters.map((f) => [f.id, Array.isArray(f.value) ? f.value.join(',') : f.value]),
  )
  const qualifierParam = serializeQualifiers(store.draftQualifiers)
  if (qualifierParam) params.set('qualifiers', qualifierParam)
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
      v-if="isFilteringTermsLoading || isFilteringGroupsLoading || isFilteringScopesLoading"
      class="state-loading"
      aria-live="polite"
      aria-label="Loading filters"
    >
      <Loader :size="24" class="spinner" aria-hidden="true" />
    </div>

    <p
      v-else-if="isFilteringTermsError || isFilteringGroupsError || isFilteringScopesError"
      class="state-error"
      role="alert"
    >
      Service is currently unavailable. Please try again later.
    </p>

    <form
      v-else-if="filteringTerms && filteringGroups && filteringScopes"
      class="form-content"
      @submit.prevent
    >
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

      <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>

      <FilterTabGroup v-model="activeTab" :scopes="scopes">
        <template v-if="filteringQualifiers && filteringQualifiers.length > 0" #header>
          <QualifierSelector
            :qualifiers="filteringQualifiers"
            :selected="store.draftQualifiers"
            @change="store.setQualifier"
          />
        </template>
        <div class="tab-columns" :class="{ 'tab-columns--full': activeTab !== 'all' }">
          <FilterTabPanel
            v-for="{ scope, sections } in scopePanelSections"
            :key="scope.id"
            :tab="scope.id"
            :label="scope.label"
            :active-tab="activeTab"
            :bordered="scopeGroupHasBorder(scope.id)"
          >
            <template
              v-for="(section, i) in sections"
              :key="section.kind === 'flat' ? `flat-${i}` : section.group.id"
            >
              <div v-if="section.kind === 'flat'" class="fields-grid fields-grid--stacked">
                <DynamicField v-for="field in section.fields" :key="field.id" :field="field" />
              </div>
              <div v-else class="subgroup" :class="subgroupClass(section.group)">
                <h3 class="subgroup-label">{{ section.group.label }}</h3>
                <div class="fields-grid fields-grid--subgroup">
                  <DynamicField v-for="field in section.fields" :key="field.id" :field="field" />
                </div>
              </div>
            </template>
          </FilterTabPanel>
        </div>
      </FilterTabGroup>

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

.fields-grid.fields-grid--stacked {
  grid-template-columns: 1fr;
}

.tab-columns {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  &.tab-columns--full > :deep(.filter-tab-panel) {
    grid-column: 1 / -1;
  }
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1.5rem;
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

.subgroup {
  margin-top: 1rem;
}

.subgroup + .fields-grid {
  margin-top: 1rem;
}

.subgroup--border {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.375rem;
  background-color: rgba(255, 255, 255, 0.04);
  padding: 1rem 1.25rem;
}

.subgroup-label {
  margin-bottom: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: var(--font-weight-body);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

@include tablet {
  .tab-columns {
    grid-template-columns: 1fr 1fr;
  }

  .fields-grid {
    grid-template-columns: repeat(2, 1fr);

    .col-span-3 {
      grid-column: 1 / -1;
    }
  }

  .fields-grid--subgroup {
    grid-template-columns: repeat(2, 1fr);
  }
}

@include desktop-small {
  .search-form {
    padding: 2.5rem;
  }

  .fields-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .fields-grid--subgroup {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
