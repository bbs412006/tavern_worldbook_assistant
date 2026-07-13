import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __WB_ASSISTANT_BUILD_COMMIT__: JSON.stringify('test-commit'),
    __WB_ASSISTANT_BUILD_BRANCH__: JSON.stringify('test-branch'),
    __WB_ASSISTANT_BUILD_TIME__: JSON.stringify('2026-07-13T00:00:00Z'),
    updateWorldbookWith: 'globalThis.updateWorldbookWith',
    getWorldbook: 'globalThis.getWorldbook',
    getWorldbookNames: 'globalThis.getWorldbookNames',
    replaceWorldbook: 'globalThis.replaceWorldbook',
    createWorldbook: 'globalThis.createWorldbook',
    deleteWorldbook: 'globalThis.deleteWorldbook',
    createWorldbookEntries: 'globalThis.createWorldbookEntries',
    getVariables: 'globalThis.getVariables',
    getScriptId: 'globalThis.getScriptId',
    replaceVariables: 'globalThis.replaceVariables',
    eventOn: 'globalThis.eventOn',
    tavern_events: 'globalThis.tavern_events',
    toastr: 'globalThis.toastr',
    generateRaw: 'globalThis.generateRaw',
  },
  plugins: [
    vue(),
    AutoImport({
      dts: false,
      imports: ['vue', 'pinia', '@vueuse/core'],
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/worldbook_assistant_build/{components,composables,domain}/**/*.test.ts'],
  },
});
