import { fileURLToPath, URL } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'

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
        // Resolves all @service/<path> imports.
        //
        // For imports with an explicit extension (e.g. .yaml, .json): tries the
        // service-specific file first, then falls back to the shared config root.
        // This lets shared config files (e.g. groups.yaml) live at config/<file>
        // without requiring every service to copy them. A service that diverges creates
        // config/<service>/<file> and the fallback never triggers for it.
        //
        // For extensionless imports (e.g. @service/content, @service/theme): probes
        // service-specific files with common extensions (.ts, .js, .scss, .css) so
        // Vite receives an absolute path it can load and transform normally.
        //
        // This plugin replaces the resolve.alias entry for @service so that it runs
        // before Vite's built-in alias plugin and can apply the fallback logic.
        name: 'service-alias',
        enforce: 'pre',
        resolveId(id) {
          if (!id.startsWith('@service/')) return
          const rel = id.slice('@service/'.length)
          const extensions = rel.includes('.') ? [''] : ['.ts', '.js', '.scss', '.css']
          for (const ext of extensions) {
            const p = fileURLToPath(new URL(`./config/${service}/${rel}${ext}`, import.meta.url))
            if (existsSync(p)) return p
          }
          // For exact-extension imports only: fall back to the shared config root.
          if (rel.includes('.')) {
            const p = fileURLToPath(new URL(`./config/${rel}`, import.meta.url))
            if (existsSync(p)) return p
          }
        },
      },
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
