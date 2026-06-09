<script setup lang="ts">
import SearchForm from '@/components/SearchForm.vue'
</script>

<template>
  <main class="search-layout">
    <section class="filters">
      <h1 class="title">Discover digital pathology sets</h1>
      <div class="filters-wrapper">
        <SearchForm />
      </div>
    </section>
    <section class="results"></section>
  </main>
</template>

<style scoped lang="scss">
.search-layout {
  flex: 1;

  .filters {
    background-color: var(--color-dark-blue);
    color: #ffffff;
    display: flex;
    flex-direction: column;

    .title {
      color: #ffffff;
      padding-top: 3rem;
      font-size: 1.5rem;
      font-weight: var(--font-weight-heading);
      text-align: center;
    }
  }
}

@include tablet {
  .search-layout {
    .title {
      font-size: 1.875rem;
    }
  }
}
</style>
