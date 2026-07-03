<template>
  <section class="cross-copy-panel" :class="{ mobile: isMobile }">
    <div class="cross-copy-head">
      <div class="cross-copy-head-main">
        <strong>📚 跨世界书复制</strong>
        <span>{{ comparedText }}</span>
      </div>
    </div>

    <div class="cross-copy-controls-wrap">
      <div class="cross-copy-controls" :class="{ 'cross-copy-controls-primary': !isMobile }">
        <label class="field">
          <span>来源世界书</span>
          <select v-model="sourceWorldbook" class="text-input">
            <option value="">请选择来源世界书</option>
            <option v-for="name in worldbookNames" :key="'src-' + name" :value="name">{{ name }}</option>
          </select>
        </label>
        <label class="field">
          <span>目标世界书</span>
          <select v-model="targetWorldbook" class="text-input">
            <option value="">请选择目标世界书</option>
            <option v-for="name in worldbookNames" :key="'tgt-' + name" :value="name">{{ name }}</option>
          </select>
        </label>
      </div>
    </div>

    <div class="cross-copy-grid" :class="{ 'mobile': isMobile }">
      <div class="cross-copy-left">
        <div class="cross-copy-list-head">
          <strong>来源条目</strong>
          <span>{{ rows.length }} 条</span>
        </div>
      </div>
      <div class="cross-copy-right">
        <div class="cross-copy-list-head">
          <strong>对比与动作</strong>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  worldbookNames: string[];
  isMobile: boolean;
}>();

const sourceWorldbook = ref('');
const targetWorldbook = ref('');
const rows = ref<any[]>([]);

const comparedText = computed(() => {
  if (!sourceWorldbook.value && !targetWorldbook.value) return '';
  if (sourceWorldbook.value === targetWorldbook.value) return '⚠️ 来源和目标相同';
  if (sourceWorldbook.value && targetWorldbook.value) return '已配置';
  return '请选择来源和目标';
});
</script>
