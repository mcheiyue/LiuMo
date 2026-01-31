<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  char?: string;
  gridType?: 'mizi' | 'tianzi' | 'huigong' | 'none';
  showGrid?: boolean;
  gridColor?: string;
  // New props for dynamic layout
  width?: number;
  height?: number;
  fontSize?: number;
  borderMode?: 'full' | 'lines-only' | 'none';
}>(), {
  char: '',
  gridType: 'mizi',
  showGrid: false,
  gridColor: 'var(--color-grid)',
  width: 96,
  height: 96,
  fontSize: 64,
  borderMode: 'full'
});

const showGrid = computed(() => {
  return props.borderMode === 'full' && props.gridType !== 'none';
});

const gridPath = computed(() => {
  if (!showGrid.value) return '';
  
  // Assuming 100x100 coordinate system internal to SVG
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
    class="relative flex items-center justify-center"
    :style="{
      width: `${width}px`,
      height: `${height}px`,
      backgroundColor: 'transparent',
      border: 'none',
      boxSizing: 'border-box'
    }"
  >
    <!-- Grid Layer -->
    <svg 
      v-if="showGrid" 
      :style="{ display: 'block', stroke: gridColor }"
      viewBox="0 0 100 100" 
      class="absolute inset-0 w-full h-full pointer-events-none stroke-[1] fill-none"
    >
      <path :d="gridPath" vector-effect="non-scaling-stroke" />
    </svg>
    
    <!-- Text Layer -->
    <span 
      class="z-10 leading-none select-none" 
      :style="{ 
        fontFamily: 'inherit', 
        color: 'var(--color-ink)',
        fontSize: `${fontSize}px` 
      }"
    >
      {{ char }}
    </span>
  </div>
</template>
