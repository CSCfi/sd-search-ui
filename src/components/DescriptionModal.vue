<script setup lang="ts">
import { ref, watch } from 'vue'
import { X } from '@lucide/vue'

const props = defineProps<{
  description: string
  title: string
  modelValue: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const dialogRef = ref<HTMLDialogElement | null>(null)

watch(
  () => props.modelValue,
  (open) => {
    if (!dialogRef.value) return
    if (open) {
      dialogRef.value.showModal()
    } else {
      dialogRef.value.close()
    }
  },
)

function close() {
  emit('update:modelValue', false)
}

function onCancel(event: Event) {
  event.preventDefault()
  close()
}
</script>

<template>
  <dialog
    ref="dialogRef"
    class="description-modal"
    aria-modal="true"
    :aria-labelledby="'modal-title-' + title"
    @cancel="onCancel"
  >
    <div class="modal-inner">
      <div class="modal-header">
        <h2 :id="'modal-title-' + title" class="modal-title">{{ title }}</h2>
        <button class="close-btn" aria-label="Close" @click="close">
          <X :size="20" aria-hidden="true" />
        </button>
      </div>
      <div class="modal-body">
        <p>{{ description }}</p>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.description-modal {
  width: min(90vw, 40rem);
  max-height: 80vh;
  border: none;
  border-radius: 0.5rem;
  padding: 0;
  box-shadow: 0 8px 32px rgb(0 0 0 / 0.2);
  overflow: hidden;
}

.description-modal::backdrop {
  background: rgb(0 0 0 / 0.5);
}

.modal-inner {
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background-color: var(--color-white);
  border-bottom: 1px solid var(--color-light-grey);
  flex-shrink: 0;
}

.modal-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: var(--font-weight-heading);
  color: var(--color-dark-blue);
}

.close-btn {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--color-dark-blue);
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;

  &:hover {
    opacity: 0.6;
  }
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  color: var(--color-text);
  line-height: 1.6;
}

.modal-body p {
  margin: 0;
}
</style>
