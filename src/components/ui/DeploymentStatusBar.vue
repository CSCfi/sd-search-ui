<script setup lang="ts">
import { computed } from 'vue'
import { useDeploymentStatus } from '@/composables/useDeploymentStatus'
import { useFilteringScopes } from '@/composables/useFilteringScopes'

const { data } = useDeploymentStatus()
const { data: filteringScopes } = useFilteringScopes()

function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

const lastIndexed = computed(() => {
  if (!data.value?.last_indexed) return null
  return formatDate(data.value.last_indexed)
})

const scopeItems = computed(() => {
  if (!data.value) return []
  const scopes = data.value.scopes
  return (filteringScopes.value ?? []).flatMap((scope) => {
    const indexed = scopes[scope.id]?.documents.indexed
    if (indexed === undefined) return []
    return [{ key: scope.id, label: scope.label, value: formatNumber(indexed) }]
  })
})
</script>

<template>
  <div v-if="data" class="deployment-status" aria-label="Deployment status">
    <div v-for="item in scopeItems" :key="item.key" class="stat-item">
      <span class="dot" :class="`dot--${item.key}`"></span>
      <span class="label">{{ item.label }}</span>
      <span class="value">{{ item.value }}</span>
    </div>
    <div v-if="lastIndexed" class="stat-item stat-item--divider">
      <span class="label">Last indexed</span>
      <span class="value">{{ lastIndexed }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.deployment-status {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 20px;
  border-bottom: 1px solid var(--color-light-grey);
  background: var(--color-surface);
  padding: 7px 32px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-item--divider {
  margin-left: -10px;
  border-left: 1px solid var(--color-light-grey);
  padding-left: 10px;
}

.dot {
  flex: none;
  border-radius: 50%;
  width: 6px;
  height: 6px;

  &--clinical {
    background-color: rgb(var(--color-scope-clinical-rgb));
  }

  &--non_clinical {
    background-color: rgb(var(--color-scope-non-clinical-rgb));
  }
}

.label {
  color: var(--color-stats-label);
  font-size: 13px;
}

.value {
  color: var(--color-stats-value);
  font-weight: 700;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
</style>
