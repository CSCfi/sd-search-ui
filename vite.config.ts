import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import yaml from '@rollup/plugin-yaml'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const service = env.VITE_SERVICE || 'bigpicture'

  const meta = JSON.parse(readFileSync(`./config/${service}/meta.json`, 'utf-8')) as {
    appTitle: string
  }

  const faviconRelPath = `src/assets/${service}/favicon.ico`
  const faviconAbsPath = fileURLToPath(new URL(faviconRelPath, import.meta.url))

  let viteCommand = 'serve'

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
      {
        name: 'service-meta',
        configResolved(config) {
          viteCommand = config.command
        },
        transformIndexHtml(html) {
          const faviconHref = viteCommand === 'build' ? '/favicon.ico' : `/${faviconRelPath}`
          return html
            .replace(/%VITE_APP_TITLE%/g, meta.appTitle)
            .replace(/%VITE_APP_FAVICON%/g, faviconHref)
        },
        generateBundle() {
          try {
            this.emitFile({
              type: 'asset',
              fileName: 'favicon.ico',
              source: readFileSync(faviconAbsPath),
            })
          } catch {
            console.warn(`[service-meta] favicon not found at ${faviconAbsPath} — skipping`)
          }
        },
      },
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
