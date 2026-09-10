import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import yaml from '@rollup/plugin-yaml'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const service = env.VITE_SERVICE || 'bigpicture'

  return {
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        // Dev equivalents of the nginx proxies in docker/nginx.conf.
        '/login': 'http://localhost:8000',
        '/logout': 'http://localhost:8000',
        '/callback': 'http://localhost:8000',
      },
    },
    plugins: [
      yaml(),
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag.startsWith('c-'),
          },
        },
      }),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@service': fileURLToPath(new URL(`./config/${service}`, import.meta.url)),
        '@service-router': fileURLToPath(new URL(`./src/router/${service}.ts`, import.meta.url)),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use '@/assets/styles/mixins' as *;`,
        },
      },
    },
  }
})
