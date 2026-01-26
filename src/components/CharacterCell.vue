<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  char?: string;
  gridType?: 'mizi' | 'tianzi' | 'huigong' | 'none';
  showGrid?: boolean;
}>(), {
  char: '',
  gridType: 'mizi',
  showGrid: true
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
    class="relative w-24 h-24 box-border flex items-center justify-center bg-paper"
  >
    <!-- Grid Layer (Internal lines only) -->
    <svg v-if="showGrid && gridType !== 'none'" viewBox="0 0 100 100" class="absolute inset-0 w-full h-full pointer-events-none opacity-30 stroke-cinnabar fill-none stroke-[1]">
      <path :d="gridPath" vector-effect="non-scaling-stroke" />
    </svg>
    
    <!-- Text Layer -->
    <span class="text-6xl text-ink z-10 leading-none select-none" style="font-family: inherit;">
      {{ char }}
    </span>
  </div>
</template>
