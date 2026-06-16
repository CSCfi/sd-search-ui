<script setup lang="ts">
import SearchForm from '@/components/SearchForm.vue'
import ResultsBanner from '@/components/ResultsBanner.vue'
import ResultsTable from '@/components/ResultsTable.vue'
</script>

<template>
  <main class="search-layout">
    <section class="filters">
      <div class="section-inner">
        <h1 class="title">Discover digital pathology sets</h1>
        <div class="filters-wrapper">
          <SearchForm />
        </div>
      </div>
    </section>
    <section class="results">
      <div class="section-inner">
        <ResultsBanner />
        <ResultsTable />
      </div>
    </section>
  </main>
</template>

<style scoped lang="scss">
.search-layout {
  flex: 1;

  .filters {
    background-color: var(--color-dark-blue);
    color: var(--color-white);
  }

  .section-inner {
    @include container;
  }

  .title {
    color: var(--color-white);
    padding-top: 3rem;
    font-size: 1.5rem;
    font-weight: var(--font-weight-heading);
    text-align: center;
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
