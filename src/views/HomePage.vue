<script setup lang="ts">
const loginUrl = import.meta.env.VITE_LOGIN_URL ?? '#'
</script>

<template>
  <main class="home-layout">
    <div class="home-hero">
      <div class="text-container">
        <h1 class="header">Discover digital pathology sets</h1>
        <p class="text">
          Bigpicture will set up the first European, ethical- and General Data
          Protection Regulation-compliant, quality-controlled and community-based
          platform, in which both large-scale data and Artificial Intelligence
          (AI) algorithms will coexist.
        </p>
        <a :href="loginUrl">
          <c-button class="login-button" type="is-primary" size="is-medium">
            Login
          </c-button>
        </a>
      </div>

      <div class="image-container">
        <img alt="" src="@/assets/images/loginImage.png" />
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
.home-layout {
  flex: 1;
}

.home-hero {
  background-color: var(--color-dark-blue);
  color: #ffffff;
  display: flex;
  flex-direction: column;
}

.image-container {
  order: -1;
  width: 100%;

  img {
    width: 100%;
    height: auto;
    display: block;
  }
}

.text-container {
  margin: 2rem 1.5rem;
}

.header {
  font-size: 1.75rem;
  font-weight: var(--font-weight-heading);
  color: #ffffff;
  line-height: 2.25rem;
  letter-spacing: 0;
  text-align: left;
}

.text {
  margin-top: 1.25rem;
  font-size: 1rem;
  font-weight: var(--font-weight-body);
  line-height: 1.5rem;
  letter-spacing: 0;
  text-align: left;
}

.login-button {
  margin-top: 1.25rem;
  background-color: var(--color-pink);
  width: 10.4375rem;
  height: 3.5rem;
  color: #ffffff;

  &:hover {
    background-color: #ff2567;
    border-color: #000000;
    border-width: 1px;
  }
}

@include tablet {
  .home-hero {
    flex-direction: row;
    align-items: stretch;
  }

  .image-container {
    order: 0;
    flex: 1;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: right center;
    }
  }

  .text-container {
    flex-shrink: 0;
    max-width: 35rem;
    margin: 3rem 2.5rem;
  }

  .header {
    font-size: 2rem;
    line-height: 2.5rem;
  }
}

@include desktop-small {
  .text-container {
    margin: 4rem 2.5rem;
  }

  .header {
    font-size: 2.25rem;
    line-height: 2.75rem;
  }
}

@include desktop-large {
  .home-hero {
    height: 32.5rem;
  }

  .text-container {
    margin: 6.25rem 2.5rem;
  }
}
</style>
