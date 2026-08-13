<script setup lang="ts">
import { computed } from 'vue'
import ScopeBadge from '@/components/filters/ScopeBadge.vue'
import type { DatasetType } from '@/stores/searchStore'

const props = defineProps<{
  tab: string
  label: string
  activeTab: DatasetType
  bordered?: boolean
}>()

const show = computed(() => props.activeTab === 'all' || props.activeTab === props.tab)
</script>

<template>
  <div
    v-if="show"
    class="filter-tab-panel"
    :class="[`filter-tab-panel--${tab}`, { 'filter-tab-panel--border': bordered }]"
  >
    <div class="panel-header">
      <h2 class="panel-title" :class="`panel-title--${tab}`">{{ label }}</h2>
      <ScopeBadge :scope-id="tab" />
    </div>
    <slot />
  </div>
</template>

<style scoped lang="scss">
.filter-tab-panel {
  min-width: 0;
}

.filter-tab-panel--border {
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 0.5rem;
  padding: 1.25rem;

  &.filter-tab-panel--non_clinical {
    border-color: rgb(var(--color-scope-non-clinical-rgb) / 0.55);
  }
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 1rem;
}

.panel-title {
  margin: 0;
  color: var(--color-white);
  font-size: 1.125rem;

  &.panel-title--non_clinical {
    color: rgb(var(--color-scope-non-clinical-light-rgb));
  }
}
</style>
