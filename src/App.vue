<script setup lang="ts">
import AppNavbar from '@/components/AppNavbar.vue'
import AppFooter from '@/components/AppFooter.vue'
import AnnouncementBanner from '@/components/ui/AnnouncementBanner.vue'
</script>

<template>
  <div class="app-layout">
    <AnnouncementBanner />
    <AppNavbar />
    <div class="app-content">
      <RouterView />
    </div>
    <AppFooter />
  </div>
</template>

<style scoped lang="scss">
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-content {
  display: flex;
  flex: 1;
  flex-direction: column;
}
</style>
