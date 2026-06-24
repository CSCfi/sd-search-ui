<template>
  <footer class="app-footer">
    <div class="footer-columns">
      <div class="footer-col-links">
        <a href="https://discovery.bigpicture.eu/" class="footer-link">About</a>
        <a href="https://datasets.bp.nbis.se/index.html" class="footer-link">Datasets</a>
        <a
          href="https://bigpicture.eu/bigpicture-privacy-notice"
          class="footer-link"
          target="_blank"
          rel="noopener noreferrer"
          >Privacy policy</a
        >
        <div class="footer-contact">
          <span class="footer-col-heading">Contact</span>
          <a href="mailto:support@bigpicture.eu" class="footer-link">support@bigpicture.eu</a>
        </div>
      </div>
      <div class="footer-col-images">
        <p class="footer-funding-text">
          This project has received funding from the Innovative Medicines Initiative 2 Joint
          Undertaking under grant agreement No 945358. This Joint Undertaking receives support from
          the European Union's Horizon 2020 research and innovation program and EFPIA.
          www.imi.europa.eu
        </p>
        <div class="footer-images">
          <img src="@/assets/images/footer_logos.png" alt="Partner logos" class="partner-logos" />
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

.eu-flag {
  width: auto;
  height: 3rem;
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
