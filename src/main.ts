import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { defineCustomElements } from '@cscfi/csc-ui/loader'
import { vControl } from '@/directives/vControl.ts'

import 'modern-normalize/modern-normalize.css'
import '@/assets/styles/main.scss'

import App from './App.vue'
import router from './router'

const app = createApp(App)

defineCustomElements()

app.use(createPinia())
app.use(router)
app.directive('control', vControl)

app.mount('#app')
