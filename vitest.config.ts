import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import type { UserConfig } from 'vite'
import viteConfigOrFn from './vite.config'

// vite.config.ts exports a callback (UserConfigFnObject) so that it can read VITE_SERVICE
// from .env via loadEnv. mergeConfig requires a plain object, so we resolve it here.
// The function is synchronous — the cast to UserConfig is safe.
const viteConfig: UserConfig =
  typeof viteConfigOrFn === 'function'
    ? (viteConfigOrFn({ mode: 'test', command: 'serve', isSsrBuild: false }) as UserConfig)
    : viteConfigOrFn

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
