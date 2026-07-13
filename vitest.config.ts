import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'node',
    include: ['tests/worldbook_assistant_build/{components,composables,domain}/**/*.test.ts'],
  },
});
