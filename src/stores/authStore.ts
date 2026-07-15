import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref<boolean | null>(null)

  function setLoggedIn(value: boolean) {
    isLoggedIn.value = value
  }

  return { isLoggedIn, setLoggedIn }
})
