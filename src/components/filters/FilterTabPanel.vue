<script setup lang="ts">
import { computed } from 'vue'
import ScopeBadge from '@/components/filters/ScopeBadge.vue'
import type { DatasetType } from '@/stores/searchStore'

const props = defineProps<{
  tab: string
  label: string
  activeTab: DatasetType
}>()

const show = computed(() => props.activeTab === 'all' || props.activeTab === props.tab)
</script>

<template>
  <div v-if="show" class="filter-tab-pane">
    <div class="panel-header">
      <h2 class="panel-title" :class="`panel-title--${tab}`">{{ label }}</h2>
      <ScopeBadge :scope-id="tab" />
    </div>
    <slot />
  </div>
</template>

<style scoped lang="scss">
.filter-tab-pane {
  min-width: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.panel-title {
  margin: 0;
  color: var(--color-white);
  font-size: 1.125rem;

  // Matches the active tab colours in FilterTabGroup: clinical keeps the plain white title,
  // non-clinical takes the orange accent. A scope with no rule here stays white.
  &.panel-title--non_clinical {
    color: rgb(var(--color-scope-non-clinical-light-rgb));
  }
}
</style>
