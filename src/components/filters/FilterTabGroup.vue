<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import type { DatasetType } from '@/stores/searchStore'
import type { BeaconFilteringScope } from '@/types/beacon'

const props = defineProps<{ modelValue: DatasetType; scopes: BeaconFilteringScope[] }>()
const emit = defineEmits<{ 'update:modelValue': [DatasetType] }>()

const tabs = computed<{ id: DatasetType; label: string }[]>(() => [
  { id: 'all', label: 'All data' },
  ...props.scopes.map((s) => ({ id: s.id as DatasetType, label: s.label })),
])

const PANEL_ID = 'filter-tab-panel'

const stripRef = useTemplateRef<HTMLDivElement>('strip')

function onTabKeydown(event: KeyboardEvent, index: number) {
  let nextIndex: number | null = null

  const count = tabs.value.length

  if (event.key === 'ArrowRight') nextIndex = (index + 1) % count
  else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + count) % count
  else if (event.key === 'Home') nextIndex = 0
  else if (event.key === 'End') nextIndex = count - 1
  else return

  event.preventDefault()
  const next = tabs.value[nextIndex]
  if (!next) return
  emit('update:modelValue', next.id)

  // Move DOM focus to the newly activated tab
  const buttons = stripRef.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
  buttons?.[nextIndex]?.focus()
}
</script>

<template>
  <div class="filter-tab-group">
    <div ref="strip" class="tab-strip" role="tablist" aria-label="Dataset type">
      <button
        v-for="(tab, index) in tabs"
        :key="tab.id"
        :id="`tab-btn-${tab.id}`"
        role="tab"
        type="button"
        class="tab"
        :class="[`tab--${tab.id}`, { 'tab--active': modelValue === tab.id }]"
        :aria-selected="modelValue === tab.id"
        :aria-controls="PANEL_ID"
        :tabindex="modelValue === tab.id ? 0 : -1"
        @click="emit('update:modelValue', tab.id)"
        @keydown="onTabKeydown($event, index)"
      >
        {{ tab.label }}
      </button>
    </div>
    <div
      :id="PANEL_ID"
      role="tabpanel"
      :aria-labelledby="`tab-btn-${modelValue}`"
      tabindex="0"
      class="tab-body"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.filter-tab-group {
  margin-top: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  background-color: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.tab-strip {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.tab {
  flex: 1;
  transition:
    color 0.15s,
    border-color 0.15s;
  cursor: pointer;
  border: none;
  border-bottom: 3px solid transparent;
  background: transparent;
  padding: 0.75rem 1rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: var(--font-weight-body);
  font-size: 0.875rem;
  font-family: var(--font-family);

  &:hover:not(.tab--active) {
    color: rgba(255, 255, 255, 0.85);
  }

  &:focus-visible {
    outline: 2px solid var(--color-pink);
    outline-offset: -2px;
  }

  // Default active styling, so a scope id with no color rule below still reads as selected.
  &.tab--active {
    border-bottom-color: #ffffff;
    color: #ffffff;

    &.tab--clinical {
      border-bottom-color: rgb(var(--color-scope-clinical-rgb) / 0.9);
      color: #ffffff;
    }

    &.tab--non_clinical {
      border-bottom-color: rgb(var(--color-scope-non-clinical-rgb));
      color: rgb(var(--color-scope-non-clinical-light-rgb));
    }
  }
}

.tab-body {
  padding: 1.25rem 1.5rem;
  min-height: 520px;
}
</style>
