<script setup lang="ts">
import { computed, ref } from 'vue'
import { useContentConfig } from '@/composables/ui/useContentConfig'
import type { AnnouncementVariant } from '@/types/content'

const STORAGE_PREFIX = 'announcement-dismissed:'

const config = useContentConfig().announcement

// Active only when both id and html are set; null values mean "no announcement".
const announcement =
  config && config.id && config.html ? { ...config, id: config.id, html: config.html } : null

function isDismissedInStorage(id: string): boolean {
  try {
    return localStorage.getItem(STORAGE_PREFIX + id) === '1'
  } catch {
    return false
  }
}

const dismissed = ref(announcement ? isDismissedInStorage(announcement.id) : false)

const inWindow = computed(() => {
  if (!announcement) return false
  const now = Date.now()
  if (announcement.startsAt) {
    const start = Date.parse(announcement.startsAt)
    if (!Number.isNaN(start) && now < start) return false
  }
  if (announcement.endsAt) {
    const end = Date.parse(announcement.endsAt)
    if (!Number.isNaN(end) && now > end) return false
  }
  return true
})

const visible = computed(() => !!announcement && inWindow.value && !dismissed.value)
const variant = computed<AnnouncementVariant>(() => announcement?.variant ?? 'info')
const dismissible = computed(() => announcement?.dismissible !== false)

function dismiss() {
  if (!announcement) return
  dismissed.value = true
  try {
    localStorage.setItem(STORAGE_PREFIX + announcement.id, '1')
  } catch {
    // Storage unavailable; dismissal lasts for this page view only.
  }
}
</script>

<template>
  <div
    v-if="visible && announcement"
    class="announcement"
    :class="`announcement--${variant}`"
    role="region"
    aria-label="Announcement"
  >
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="announcement-message" v-html="announcement.html"></div>
    <button
      v-if="dismissible"
      type="button"
      class="dismiss-btn"
      aria-label="Dismiss announcement"
      @click="dismiss"
    >
      ✕
    </button>
  </div>
</template>

<style scoped lang="scss">
.announcement {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  background-color: var(--color-announcement-bg, var(--color-bright-blue));
  padding: 0.75rem 1.5rem;
  color: var(--color-announcement-text, var(--color-white));
  font-weight: var(--font-weight-body);
  font-size: 1rem;

  &--warning {
    background-color: var(--color-announcement-warning-bg, var(--color-pink));
    color: var(--color-announcement-warning-text, var(--color-text));
    font-weight: 700;
  }
}

.announcement-message {
  flex: 1;
  text-align: center;

  :deep(p) {
    margin: 0;
  }

  :deep(a) {
    color: var(--color-announcement-link, currentcolor);
    font-weight: 900;
    text-decoration: underline;
  }
}

.dismiss-btn {
  display: inline-flex;
  flex-shrink: 0;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  border: none;
  background: none;
  width: 2.75rem;
  height: 2.75rem;
  color: inherit;
  font-size: 1rem;
  line-height: 1;

  &:hover {
    opacity: 0.8;
  }

  &:focus-visible {
    outline: 2px solid currentcolor;
    outline-offset: -2px;
  }
}
</style>
