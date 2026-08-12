<script setup lang="ts">
import { computed } from 'vue'
import type { DatasetType } from '@/stores/searchStore'

const props = defineProps<{
  tab: string
  activeTab: DatasetType
}>()

const show = computed(() => props.activeTab === 'all' || props.activeTab === props.tab)
</script>

<template>
  <div v-if="show" class="filter-tab-pane">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.filter-tab-pane {
  min-width: 0;
}
</style>
