<script setup lang="ts">
import { computed, ref } from 'vue'
import { CircleAlert, Info, Loader, Sparkles, X } from '@lucide/vue'
import { useAIFilterInput } from '@/composables/query/useAIFilterInput'
import { useContentConfig } from '@/composables/ui/useContentConfig'

const MAX_LENGTH = 300
// Counter is only shown once the user gets close to the limit.
const COUNTER_THRESHOLD = 250

const { aiSearch: copy } = useContentConfig()
const { state, submit, cancel, dismiss } = useAIFilterInput()

const text = ref('')

const isLoading = computed(() => state.value.kind === 'loading')
const canApply = computed(() => text.value.trim().length > 0 && !isLoading.value)
const showCounter = computed(() => text.value.length >= COUNTER_THRESHOLD)

// Error and mixed scope are problems the user must notice (role="alert"); the rest is
// information announced politely.
const isProblem = computed(() => state.value.kind === 'error' || state.value.kind === 'mixed-scope')

const message = computed(() => {
  const s = state.value
  switch (s.kind) {
    case 'success': {
      const notes = [
        s.switchedTo ? copy.switchedNote.replace('{tab}', s.switchedTo) : '',
        s.removed.length > 0 ? copy.removedNote.replace('{fields}', s.removed.join(', ')) : '',
      ].filter(Boolean)
      return { text: s.interpretation, notes }
    }
    case 'not-understood':
      return { text: s.interpretation, notes: [copy.notUnderstood] }
    case 'mixed-scope':
      return { text: copy.mixedScope, notes: [] }
    case 'error':
      return { text: copy.error, notes: [] }
    default:
      return null
  }
})

async function apply() {
  if (!canApply.value) return
  // The text is cleared only when the filters were applied, so a failed try can be edited.
  if (await submit(text.value.trim())) text.value = ''
}

function onEscape() {
  if (isLoading.value) cancel()
}
</script>

<template>
  <div class="ai-search" @keydown.esc="onEscape">
    <div class="card">
      <div class="label-row">
        <label for="ai-search-input" class="label">{{ copy.label }}</label>
        <span class="marker">
          <Sparkles :size="12" aria-hidden="true" />
          {{ copy.marker }}
        </span>
      </div>

      <div class="input-row">
        <input
          id="ai-search-input"
          v-model="text"
          type="text"
          class="input"
          :placeholder="copy.placeholder"
          :maxlength="MAX_LENGTH"
          aria-describedby="ai-search-helper"
          @keydown.enter.prevent="apply"
        />
        <c-button v-if="isLoading" class="btn-apply" ghost type="button" @click="cancel">
          {{ copy.cancelLabel }}
        </c-button>
        <c-button v-else class="btn-apply" ghost type="button" :disabled="!canApply" @click="apply">
          {{ copy.applyLabel }}
        </c-button>
      </div>

      <div class="message-row">
        <p id="ai-search-helper" class="helper">{{ copy.helper }}</p>
        <span v-if="showCounter" class="counter" aria-live="polite">
          {{ text.length }} / {{ MAX_LENGTH }}
        </span>
      </div>

      <!-- Always rendered so screen readers register the live region before it has content. -->
      <div class="status" aria-live="polite">
        <p v-if="isLoading" class="status-box">
          <Loader :size="16" class="spinner" aria-hidden="true" />
          {{ copy.loading }}
        </p>
        <div
          v-else-if="message"
          class="status-box"
          :class="{ 'status-box--problem': isProblem }"
          :role="isProblem ? 'alert' : undefined"
        >
          <CircleAlert v-if="isProblem" :size="16" class="status-icon" aria-hidden="true" />
          <Info v-else :size="16" class="status-icon" aria-hidden="true" />
          <div class="status-text">
            <p>{{ message.text }}</p>
            <p v-for="note in message.notes" :key="note">{{ note }}</p>
          </div>
          <button type="button" class="dismiss" :aria-label="copy.dismissLabel" @click="dismiss">
            <X :size="16" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>

    <p class="divider">{{ copy.divider }}</p>
  </div>
</template>

<style scoped lang="scss">
.ai-search {
  margin-bottom: 1.5rem;
}

// Stronger tint and border than the bordered filter groups, so the AI input reads as
// its own section rather than as one more filter group.
.card {
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 0.5rem;
  background-color: rgba(255, 255, 255, 0.1);
  padding: 1.25rem 1.5rem;
}

.divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 2rem 0 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.875rem;
  white-space: nowrap;

  &::before,
  &::after {
    flex: 1;
    border-top: 1px solid rgba(255, 255, 255, 0.3);
    content: '';
  }
}

.label-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.label {
  color: var(--color-white);
  font-weight: var(--font-weight-heading);
  font-size: 1rem;
  letter-spacing: 0.15em;
}

.marker {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 9999px;
  padding: 0.125rem 0.625rem;
  color: var(--color-white);
  font-weight: var(--font-weight-heading);
  font-size: 0.75rem;
  white-space: nowrap;
}

.input-row {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.input {
  display: block;
  flex: 1;
  box-sizing: border-box;
  border: 1px solid var(--color-light-grey);
  border-radius: 4px;
  background: var(--color-white);
  padding: 0 1rem;
  width: 100%;
  min-width: 0;
  height: 44px;
  color: var(--color-text);
  font-size: 1rem;
  font-family: var(--font-family);

  &::placeholder {
    color: var(--color-text-secondary);
  }

  &:hover {
    border-color: var(--color-bright-blue);
  }

  &:focus {
    outline: 2px solid var(--color-pink);
    outline-offset: 2px;
  }
}

.btn-apply {
  --c-button-background-color: rgba(255, 255, 255, 0.1);
  --c-button-outlined-text-color: var(--color-white);
  --c-button-outlined-border-color: rgba(255, 255, 255, 0.4);
  --c-button-outlined-background-color-hover: rgba(255, 255, 255, 0.15);
  --c-button-outlined-loader-color: transparent;
  transition: opacity 0.2s ease;

  width: 100%;

  &[disabled] {
    opacity: 0.6;
  }

  &:focus-within {
    outline: 2px solid var(--color-pink);
    outline-offset: 2px;
  }
}

.message-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.5rem;
}

.helper {
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.8125rem;
}

.counter {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.8125rem;
}

.status {
  margin-top: 0.75rem;
}

.status-box {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  margin: 0;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  padding: 0.625rem 0.75rem;
  color: var(--color-white);
  font-size: 0.875rem;

  &--problem {
    border: 2px solid var(--color-white);
  }
}

.status-icon,
.spinner {
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.spinner {
  animation: ai-spin 1s linear infinite;
}

@keyframes ai-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}

.status-text {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;

  p {
    margin: 0;
  }

  p + p {
    margin-top: 0.25rem;
  }
}

.dismiss {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  cursor: pointer;
  border: 0;
  background: none;
  padding: 0.125rem;
  color: var(--color-white);

  &:focus-visible {
    outline: 2px solid var(--color-pink);
    outline-offset: 2px;
  }
}

@include tablet {
  .input-row {
    flex-direction: row;
  }

  .btn-apply {
    flex-shrink: 0;
    width: 7.5rem;
  }
}
</style>
