<script setup lang="ts">
defineProps<{
  modelValue: boolean
  label?: string
  ariaLabelledby?: string
  inputId: string
}>()

defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <label class="toggle" :for="inputId">
    <input
      :id="inputId"
      type="checkbox"
      role="switch"
      class="toggle-input"
      :checked="modelValue"
      :aria-labelledby="ariaLabelledby"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="toggle-track" aria-hidden="true">
      <span class="toggle-thumb" />
    </span>
    <span v-if="label" class="toggle-label">{{ label }}</span>
  </label>
</template>

<style scoped lang="scss">
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;

  &-input {
    position: absolute;
    margin: -1px;
    padding: 0;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;

    &:checked + .toggle-track {
      background: var(--color-pink);

      .toggle-thumb {
        transform: translateX(1.125rem);
      }
    }

    &:focus-visible + .toggle-track {
      outline: 2px solid var(--color-white);
      outline-offset: 2px;
    }
  }

  &-track {
    display: inline-block;
    position: relative;
    transition: background 0.15s ease;
    border-radius: 0.6875rem;
    background: rgba(255, 255, 255, 0.25);
    width: 2.5rem;
    height: 1.375rem;
  }

  &-thumb {
    position: absolute;
    top: 0.125rem;
    left: 0.125rem;
    transition: transform 0.15s ease;
    border-radius: 50%;
    background: var(--color-white);
    width: 1.125rem;
    height: 1.125rem;
  }

  &-label {
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.875rem;
    user-select: none;
  }
}
</style>
