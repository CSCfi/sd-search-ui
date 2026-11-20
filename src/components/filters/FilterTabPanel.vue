<script setup lang="ts">
import { computed } from 'vue'
import ScopeBadge from '@/components/filters/ScopeBadge.vue'
import type { DatasetType } from '@/stores/searchStore'

const props = defineProps<{
  tab: string
  label: string
  activeTab: DatasetType
  bordered?: boolean
  // Locked panels keep their fields visible but dimmed and unusable.
  locked?: boolean
  // Visible text explaining the lock. Rendered outside the inert region so screen readers read it.
  lockedReason?: string
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
    <p v-if="locked && lockedReason" class="lock-message">{{ lockedReason }}</p>
    <!-- Inert removes the fields from focus order and the accessibility tree. -->
    <div :inert="locked ? true : undefined" :class="{ 'panel-body--locked': locked }">
      <slot />
    </div>
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

.lock-message {
  margin: 0 0 1rem;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.875rem;
}

.panel-body--locked {
  opacity: 0.45;
  pointer-events: none;
  user-select: none;
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
