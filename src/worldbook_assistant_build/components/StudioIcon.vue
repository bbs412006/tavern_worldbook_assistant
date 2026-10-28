<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{ name: string; size?: number }>(), {
  size: 18,
});

const icons: Record<string, string[]> = {
  book: [
    'M4 19.5A2.5 2.5 0 0 1 6.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z',
  ],
  workbench: [
    'M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z',
  ],
  tags: [
    'M20.6 13.6 11 23.2 1.8 14V4.8A3 3 0 0 1 4.8 1.8H14l6.6 6.6a3.7 3.7 0 0 1 0 5.2Z',
    'M7.5 7.5h.01',
  ],
  globe: [
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', 'M3 12h18',
    'M12 3a15 15 0 0 1 0 18', 'M12 3a15 15 0 0 0 0 18',
  ],
  copy: [
    'M8 8h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z',
    'M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2',
  ],
  sparkle: [
    'm12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z',
    'M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z',
  ],
  history: [
    'M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5', 'M12 7v5l3 2',
  ],
  settings: [
    'M4 7h10', 'M18 7h2', 'M4 17h2', 'M10 17h10', 'M14 4v6', 'M8 14v6',
  ],
  command: [
    'M9 6a3 3 0 1 0-3 3h3V6Z', 'M15 6a3 3 0 1 1 3 3h-3V6Z',
    'M9 18a3 3 0 1 1-3-3h3v3Z', 'M15 18a3 3 0 1 0 3-3h-3v3Z',
    'M9 9h6v6H9V9Z',
  ],
  search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z', 'm20 20-3.6-3.6'],
  plus: ['M12 5v14', 'M5 12h14'],
  upload: ['M12 16V4', 'M7 9l5-5 5 5', 'M4 20h16'],
  download: ['M12 3v12', 'M7 10l5 5 5-5', 'M4 20h16'],
  trash: ['M4 7h16', 'M9 3h6l1 4H8l1-4Z', 'M6 7l1 14h10l1-14', 'M10 11v6', 'M14 11v6'],
  refresh: [
    'M20 11a8 8 0 0 0-14-4L3 10', 'M3 4v6h6', 'M4 13a8 8 0 0 0 14 4l3-3', 'M21 20v-6h-6',
  ],
  save: [
    'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z',
    'M17 21v-8H7v8', 'M7 3v5h8',
  ],
  pen: ['m4 20 4.5-1.5L20 7a2.1 2.1 0 0 0-3-3L5.5 15.5 4 20Z', 'm14 7 3 3'],
  list: ['M8 6h12', 'M8 12h12', 'M8 18h12', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
  eye: ['M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z', 'M12 9.3a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4Z'],
  user: ['M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z', 'M4 21a8 8 0 0 1 16 0'],
  check: ['m5 12.5 4.2 4.2L19 7'],
  close: ['m6 6 12 12', 'M18 6 6 18'],
  arrow: ['M5 12h14', 'M14 7l5 5-5 5'],
  lock: ['M5 10h14v11H5z', 'M8 10V7a4 4 0 0 1 8 0v3'],
  sliders: ['M4 7h10', 'M18 7h2', 'M4 17h2', 'M10 17h10', 'M14 4v6', 'M8 14v6'],
  activity: ['M3 12h4l2-6 4 12 2-6h6'],
  'chevron-left': ['m15 18-6-6 6-6'],
  'chevron-right': ['m9 18 6-6-6-6'],
  'chevron-down': ['m6 9 6 6 6-6'],
  more: ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
  sort: ['M3 6h18', 'M7 12h10', 'M10 18h4'],
  expand: ['M15 3h6v6', 'M9 21H3v-6', 'M21 3l-7 7', 'M3 21l7-7'],
  collapse: ['M4 14h6v6', 'M20 10h-6V4', 'M14 10l7-7', 'M3 21l7-7'],
  chat: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  layers: ['m12 2 9 4.5-9 4.5L3 6.5 12 2Z', 'm3 12 9 4.5 9-4.5', 'm3 17.5 9 4.5 9-4.5'],
  font: ['M4 7V4h16v3', 'M9 20h6', 'M12 4v16'],
  typography: ['M4 7V4h16v3', 'M9 20h6', 'M12 4v16'],
};

const paths = computed(() => icons[props.name] ?? icons.workbench);
</script>

<template>
  <svg
    class="studio-icon"
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="(path, index) in paths" :key="index" :d="path" />
  </svg>
</template>
