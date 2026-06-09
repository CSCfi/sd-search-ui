<template>
  <footer class="app-footer">
    <img src="@/assets/images/eu-flag-bw.jpg" alt="EU flag" class="eu-flag" />
    <img src="@/assets/images/footer_logos.png" alt="Partner logos" class="partner-logos" />
  </footer>
</template>

<style scoped lang="scss">
.app-footer {
  background-color: var(--color-light-grey);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  height: 15.625rem;
  padding: 0 1.5rem;
}

.eu-flag {
  height: 3rem;
  width: auto;
}

.partner-logos {
  height: 3rem;
  width: auto;
}

@include tablet {
  .app-footer {
    flex-direction: row;
    justify-content: center;
    gap: 3rem;
    padding: 0 2.5rem;
  }
}
</style>
