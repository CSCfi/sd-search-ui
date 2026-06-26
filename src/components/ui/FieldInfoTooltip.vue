<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { onClickOutside, onKeyStroke } from '@vueuse/core'
import { Info } from '@lucide/vue'

const props = defineProps<{
  fieldId: string
  description: string
}>()

const containerRef = useTemplateRef<HTMLElement>('container')
const isPinned = ref(false)
const isHovered = ref(false)
const isVisible = computed(() => isPinned.value || isHovered.value)

function show() {
  isHovered.value = true
}

function hideIfNotPinned() {
  isHovered.value = false
}

function togglePin() {
  isPinned.value = !isPinned.value
}

onClickOutside(containerRef, () => {
  isPinned.value = false
})

onKeyStroke('Escape', () => {
  isPinned.value = false
})
</script>

<template>
  <div ref="container" class="info-tooltip">
    <button
      type="button"
      class="info-icon"
      aria-label="More information"
      :aria-describedby="`${props.fieldId}-description`"
      @mouseenter="show"
      @mouseleave="hideIfNotPinned"
      @focus="show"
      @blur="hideIfNotPinned"
      @click="togglePin"
    >
      <Info :size="14" aria-hidden="true" />
    </button>
    <div
      v-show="isVisible"
      :id="`${props.fieldId}-description`"
      class="info-bubble"
      role="tooltip"
      :aria-hidden="!isVisible"
    >
      {{ description }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.info-tooltip {
  display: inline-flex;
  position: relative;
  flex-shrink: 0;
  align-items: center;
}

.info-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  border: none;
  border-radius: 2px;
  background: transparent;
  padding: 5px;
  min-width: 24px;
  min-height: 24px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1;

  &:hover {
    color: var(--color-white);
  }

  &:focus-visible {
    outline: 2px solid var(--color-pink);
    outline-offset: 2px;
    color: var(--color-white);
  }
}

.info-bubble {
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--color-light-grey);
  border-radius: 4px;
  background: var(--color-white);
  padding: 0.5rem 0.75rem;
  width: max-content;
  max-width: 240px;
  color: var(--color-text);
  font-size: 0.875rem;
  line-height: 1.4;
  font-family: var(--font-family);
  white-space: normal;
}
</style>
