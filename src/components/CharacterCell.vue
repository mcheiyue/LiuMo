<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  char?: string;
  gridType?: 'mizi' | 'tianzi' | 'huigong' | 'none';
  showGrid?: boolean;
  gridColor?: string;
}>(), {
  char: '',
  gridType: 'mizi',
  showGrid: false,
  gridColor: 'var(--color-grid)'
});

const gridPath = computed(() => {
  if (!props.showGrid || props.gridType === 'none') return '';
  
  // Assuming 100x100 coordinate system
  switch (props.gridType) {
    case 'tianzi':
      return 'M 0 50 L 100 50 M 50 0 L 50 100';
    case 'mizi':
      // Tianzi + diagonals
      return 'M 0 50 L 100 50 M 50 0 L 50 100 M 0 0 L 100 100 M 100 0 L 0 100';
    case 'huigong':
      // Simplified HuiGong (inner rectangle)
      return 'M 0 50 L 100 50 M 50 0 L 50 100 M 25 25 L 75 25 L 75 75 L 25 75 Z';
    default:
      return '';
  }
});
</script>

<template>
  <div 
    class="relative w-24 h-24 flex items-center justify-center"
    :style="{
      width: '96px',
      height: '96px',
      backgroundColor: 'var(--color-paper)', // 恢复纸张背景，遮挡底层的红色
      border: 'none',
      boxSizing: 'border-box'
    }"
  >
    <!-- Grid Layer (Internal lines only) -->
    <!-- Phase 5 Fix: Ensure SVG is strictly controlled by gridType/showGrid -->
    <svg 
      v-if="showGrid && gridType !== 'none'" 
      :style="{ display: 'block', stroke: gridColor }"
      viewBox="0 0 100 100" 
      class="absolute inset-0 w-full h-full pointer-events-none stroke-[1] fill-none"
    >
      <path :d="gridPath" vector-effect="non-scaling-stroke" />
    </svg>
    
    <!-- Text Layer -->
    <span class="text-6xl z-10 leading-none select-none" style="font-family: inherit; color: var(--color-ink);">
      {{ char }}
    </span>
  </div>
</template>
