<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick } from 'vue'
import { X } from '@lucide/vue'
import { useContentConfig } from '@/composables/useContentConfig'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const sidebarRef = ref<HTMLElement | null>(null)

const { help } = useContentConfig()

let previouslyFocused: HTMLElement | null = null

watch(
  () => props.open,
  async (isOpen) => {
    document.body.style.overflow = isOpen ? 'hidden' : ''

    if (isOpen) {
      previouslyFocused = document.activeElement as HTMLElement | null
      await nextTick()
      sidebarRef.value?.querySelector<HTMLElement>('.help-close')?.focus()
    } else {
      await nextTick()
      previouslyFocused?.focus()
      previouslyFocused = null
    }
  },
)

onUnmounted(() => {
  document.body.style.overflow = ''
})

function trapFocus(e: KeyboardEvent) {
  if (e.key !== 'Tab') return

  const focusable = sidebarRef.value?.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )

  if (!focusable || focusable.length === 0) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (!first || !last) return
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    emit('close')
    return
  }
  trapFocus(e)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="overlay-fade">
      <div v-if="open" class="help-overlay" aria-hidden="true" @click="$emit('close')" />
    </Transition>

    <Transition name="sidebar-slide">
      <div
        v-if="open"
        ref="sidebarRef"
        class="help-sidebar"
        role="dialog"
        aria-modal="true"
        aria-label="Search help"
        @keydown="onKeydown"
      >
        <div class="help-header">
          <h2 class="help-title">Search help</h2>
          <button class="help-close" aria-label="Close" @click="$emit('close')">
            <X :size="18" aria-hidden="true" />
          </button>
        </div>

        <div class="help-body">
          <nav class="help-toc" aria-label="Help sections">
            <a v-for="section in help.sections" :key="section.id" :href="'#' + section.id">
              {{ section.title }}
            </a>
          </nav>

          <div
            v-for="section in help.sections"
            :id="section.id"
            :key="section.id"
            class="help-section"
          >
            <h3 class="help-section-title">{{ section.title }}</h3>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="help-section-body" v-html="section.html" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.2s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}

.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
  transition: transform 0.25s ease;
}

.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
  transform: translateX(100%);
}

.help-overlay {
  position: fixed;
  z-index: 200;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
}

.help-sidebar {
  display: flex;
  position: fixed;
  top: 0;
  right: 0;
  flex-direction: column;
  z-index: 201;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.18);
  background: var(--color-white);
  width: min(380px, 90vw);
  height: 100vh;

  .help-header {
    display: flex;
    flex-shrink: 0;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--color-light-grey);
    padding: 1.25rem 1.5rem;

    .help-title {
      color: var(--color-dark-blue);
      font-weight: var(--font-weight-heading);
      font-size: 1rem;
      letter-spacing: 0.04em;
    }

    .help-close {
      display: flex;
      cursor: pointer;
      border: none;
      background: transparent;
      padding: 0.25rem;
      color: var(--color-text-secondary);

      &:hover {
        color: var(--color-text);
      }
    }
  }

  .help-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1.5rem;
    overflow-y: auto;

    .help-toc {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      border-bottom: 1px solid var(--color-light-grey);
      padding-bottom: 1rem;

      a {
        color: var(--color-bright-blue);
        font-size: 0.8125rem;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }

    .help-section {
      .help-section-title {
        margin-bottom: 0.5rem;
        color: var(--color-dark-blue);
        font-weight: 700;
        font-size: 0.875rem;
      }

      .help-section-body {
        color: var(--color-text);
        font-size: 0.875rem;
        line-height: 1.6;

        :deep(p) {
          margin: 0;
        }

        :deep(p + p) {
          margin-top: 0.625rem;
        }
      }
    }
  }
}
</style>
