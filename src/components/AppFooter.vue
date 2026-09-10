<script setup lang="ts">
import { useContentConfig } from '@/composables/useContentConfig'

const content = useContentConfig()
</script>

<template>
  <footer class="app-footer">
    <div class="footer-columns">
      <div class="footer-col-links">
        <a
          v-for="link in content.footer.links"
          :key="link.href"
          :href="link.href"
          class="footer-link"
          v-bind="link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {}"
          >{{ link.label }}</a
        >
        <div class="footer-contact">
          <span class="footer-col-heading">Contact</span>
          <a :href="`mailto:${content.footer.contact.email}`" class="footer-link">{{
            content.footer.contact.email
          }}</a>
        </div>
      </div>
      <div class="footer-col-images">
        <p class="footer-funding-text">{{ content.footer.fundingText }}</p>
        <div class="footer-images">
          <img :src="content.footer.logoSrc" :alt="content.footer.logoAlt" class="partner-logos" />
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped lang="scss">
.app-footer {
  background-color: var(--color-light-purple);
  padding: 2rem 1.5rem 1.5rem;
}

.footer-columns {
  @include container;
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

.footer-col-links {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.footer-contact {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 1rem;
}

.footer-col-heading {
  color: var(--color-dark-blue);
  font-weight: var(--font-weight-heading);
  font-size: 0.875rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.footer-link {
  color: var(--color-bright-blue);
  font-size: 0.9375rem;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.footer-col-images {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  text-align: center;
}

.footer-funding-text {
  max-width: 36rem;
  color: var(--color-dark-blue);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.footer-images {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 2rem;
}

.partner-logos {
  width: auto;
  height: 3rem;
}

@include tablet {
  .app-footer {
    padding: 2.5rem;
  }

  .footer-columns {
    grid-template-columns: auto 1fr;
    align-items: start;
    gap: 3rem;
  }
}
</style>
