<script setup lang="ts">
import loginButton from '@/assets/images/button-login.svg'
const loginUrl = import.meta.env.VITE_LOGIN_URL ?? '#'
</script>

<template>
  <main class="home-layout">
    <div class="home-hero">
      <div class="text-container">
        <h1 class="header">Discover digital pathology sets</h1>
        <p class="text">
          Bigpicture will set up the first European, ethical- and General Data Protection
          Regulation-compliant, quality-controlled and community-based platform, in which both
          large-scale data and Artificial Intelligence (AI) algorithms will coexist.
        </p>
        <a :href="loginUrl" class="login-button">
          <img :src="loginButton" alt="Login with LifeScience AAI" />
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

  .home-hero {
    display: flex;
    flex-direction: column;
    background-color: var(--color-dark-blue);
    color: var(--color-white);
  }

  .image-container {
    order: -1;
    width: 100%;

    img {
      display: block;
      width: 100%;
      height: auto;
    }
  }

  .text-container {
    margin: 2rem 1.5rem;
  }

  .header {
    color: var(--color-white);
    font-weight: var(--font-weight-heading);
    font-size: 1.75rem;
    line-height: 2.25rem;
    letter-spacing: 0;
    text-align: left;
  }

  .text {
    margin-top: 1.25rem;
    font-weight: var(--font-weight-body);
    font-size: 1rem;
    line-height: 1.5rem;
    letter-spacing: 0;
    text-align: left;
  }

  .login-button {
    display: inline-block;
    margin-top: 1.25rem;

    img {
      display: block;
      width: auto;
      height: 3.5rem;
    }
  }
}

@include tablet {
  .home-layout {
    .home-hero {
      flex-direction: row;
      align-items: stretch;
    }

    .image-container {
      flex: 1;
      order: 0;

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: right center;
      }
    }

    .text-container {
      flex-shrink: 0;
      margin: 3rem 2.5rem;
      max-width: 35rem;
    }

    .header {
      font-size: 2rem;
      line-height: 2.5rem;
    }
  }
}

@include desktop-small {
  .home-layout {
    .text-container {
      margin: 4rem 2.5rem;
    }

    .header {
      font-size: 2.25rem;
      line-height: 2.75rem;
    }
  }
}

@include desktop-large {
  .home-layout {
    .home-hero {
      height: 32.5rem;
    }

    .text-container {
      margin: 6.25rem 2.5rem;
    }
  }
}
</style>
