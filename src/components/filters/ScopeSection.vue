<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DynamicField from '@/components/dynamic/DynamicField.vue'
import FilterTabGroup from '@/components/filters/FilterTabGroup.vue'
import FilterTabPanel from '@/components/filters/FilterTabPanel.vue'
import ObservationTypeSelector from '@/components/filters/ObservationTypeSelector.vue'
import { useFilteringTerms } from '@/composables/query/useFilteringTerms'
import { useFilteringGroups } from '@/composables/query/useFilteringGroups'
import { useFilteringScopes } from '@/composables/query/useFilteringScopes'
import { useFieldScopes } from '@/composables/ui/useFieldScopes'
import { fieldsConfig } from '@/services/config'
import { useSearchStore, type DatasetType } from '@/stores/searchStore'
import type { BeaconFilteringGroup, BeaconFilteringTerm } from '@/types/beacon'

const { data: filteringTerms } = useFilteringTerms()
const { data: filteringGroups } = useFilteringGroups()
const { data: filteringScopes } = useFilteringScopes()
const { data: fieldScopes } = useFieldScopes()
const store = useSearchStore()

const announcement = ref('')

const scopes = computed(() =>
  (filteringScopes.value ?? []).filter((s) => !fieldsConfig.hidden_scopes.includes(s.id)),
)
const scopeIds = computed(() => scopes.value.map((s) => s.id))

// All scope ids from the API, regardless of hidden_scopes. Used to determine whether a
// field is truly shared (present in every backend scope), so that hiding a scope does not
// accidentally promote scope-specific fields into the shared grid above the tabs.
const allScopeIds = computed(() => (filteringScopes.value ?? []).map((s) => s.id))

const showAllTab = computed(() => scopes.value.length > 1)

// A field is shared only if it exists in every scope, so it belongs above the tabs.
// Uses allScopeIds (unfiltered) so hidden scopes don't affect the shared/scoped split.
const isShared = (field: BeaconFilteringTerm) =>
  allScopeIds.value.every((id) => field.scopes.includes(id))

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

// When only one scope is visible (others hidden via fields.yaml), auto-select it so the
// search query targets that scope instead of 'all'. Fires immediately on load too.
watch(
  scopes,
  (visible) => {
    if (visible.length === 1 && store.datasetType === 'all') {
      store.setDatasetType(visible[0]!.id as DatasetType)
    }
  },
  { immediate: true },
)

// Fields listed in fieldsConfig.header are rendered in the #header slot above the tabs
// instead of the regular filter grid.
const headerFields = computed(
  () => filteringTerms.value?.filter((f) => fieldsConfig.header.includes(f.id)) ?? [],
)

// Each header field needs explicit extraction and a compatible dedicated component.
const observationTypeField = computed(() =>
  headerFields.value.find((f) => f.id === 'observation_type'),
)

// The observation_type selection is a plain filter in draftFilters (string | null).
const selectedObservationType = computed<string | null>(() => {
  const f = store.draftFilters.find((f) => f.id === 'observation_type')
  return f && typeof f.value === 'string' ? f.value : null
})

function onObservationTypeChange(fieldId: string, value: string) {
  if (value === 'all') {
    store.removeFilters([fieldId])
  } else {
    store.setFilter(fieldId, value)
  }
}

// Scope sections preserve filteringTerms order: root-group fields render flat, while
// child-group fields render in labelled subgroups. `kind` discriminates the two layouts.
type FlatSection = { kind: 'flat'; fields: BeaconFilteringTerm[] }
type SubgroupSection = {
  kind: 'subgroup'
  group: BeaconFilteringGroup
  fields: BeaconFilteringTerm[]
}
type Section = FlatSection | SubgroupSection

const scopedSections = (scope: string): Section[] => {
  const sections: Section[] = []
  const groups = filteringGroups.value ?? []

  for (const field of filteringTerms.value ?? []) {
    if (isShared(field) || !field.scopes.includes(scope)) continue

    const group = groups.find((g) => g.id === field.group)
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

const subgroupClass = (group: BeaconFilteringGroup) => ({
  'subgroup--border': fieldsConfig.bordered.includes(group.id),
})
</script>

<template>
  <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>

  <FilterTabGroup
    v-if="scopes.length > 0"
    v-model="activeTab"
    :scopes="scopes"
    :show-all-tab="showAllTab"
  >
    <template v-if="headerFields.length > 0" #header>
      <ObservationTypeSelector
        v-if="observationTypeField"
        :field="observationTypeField"
        :selected="selectedObservationType"
        @change="onObservationTypeChange"
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
</template>

<style scoped lang="scss">
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.tab-columns {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  &.tab-columns--full > :deep(.filter-tab-panel) {
    grid-column: 1 / -1;
  }
}

.fields-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.fields-grid.fields-grid--stacked {
  grid-template-columns: 1fr;
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
  }

  .fields-grid--subgroup {
    grid-template-columns: repeat(2, 1fr);
  }
}

@include desktop-small {
  .fields-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .fields-grid--subgroup {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
