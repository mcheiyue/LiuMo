<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watchEffect } from 'vue';
import { usePoetryStore } from '@/stores/poetry';
import { useConfigStore } from '@/stores/config'; // Import ConfigStore
import { useLayoutEngine } from '@/utils/layoutEngine';
import CharacterCell from './CharacterCell.vue';

const containerRef = ref<HTMLElement>();
const scrollTop = ref(0);
const viewHeight = ref(800); 

const poetryStore = usePoetryStore();
const configStore = useConfigStore(); // Use ConfigStore
const { config: layoutConfig, calculate } = useLayoutEngine();

// Bridge: Sync ConfigStore -> LayoutEngine Config
watchEffect(() => {
  // Map ConfigStore fields to LayoutConfig
  // Note: LayoutConfig is generic (fontSize, gridSize). 
  // ConfigStore might have different names or logic.
  // We need to decide how fontSize is derived. 
  // ConfigStore doesn't seem to have fontSize directly? 
  // It has `fixedGrid` (rows/cols).
  // If `fixedGrid` is enabled, we derive fontSize from canvas dimensions?
  // Or we use a default scaler?
  
  // For V8.0 simplified fix:
  // Let's assume some defaults or add fontSize to ConfigStore later.
  // For now, we update what we can.
  
  // If ConfigStore implies dynamic sizing based on rows/cols:
  // V8.0 LayoutEngine supports explicit fontSize/gridSize.
  // Let's keep LayoutEngine defaults for now but allow overriding if ConfigStore has relevant fields.
  
  // Actually, users want to change font size. 
  // If ConfigStore lacks it, we should add it or use fixedGrid logic.
  // Assuming standard view:
  
  // Update Grid Type for rendering (passed to cell, not engine calculation usually, 
  // unless grid size depends on it)
});

// Recalculate layout when content or config changes
const layoutResult = computed(() => {
  if (!poetryStore.parsedContent) return null;
  return calculate(poetryStore.parsedContent, layoutConfig.value);
});

const totalHeight = computed(() => layoutResult.value?.totalHeight || 0);

const visibleItems = computed(() => {
  if (!layoutResult.value) return [];
  return layoutResult.value.getViewportItems(scrollTop.value, viewHeight.value);
});

const onScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  scrollTop.value = target.scrollTop;
};

// ... ResizeObserver code ...

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (containerRef.value) {
    viewHeight.value = containerRef.value.clientHeight;
    
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        viewHeight.value = entry.contentRect.height;
      }
    });
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>

<template>
  <div 
    ref="containerRef" 
    class="relative w-full h-full overflow-y-auto overflow-x-hidden bg-[var(--color-bg-canvas)]"
    @scroll="onScroll"
  >
    <!-- Placeholder for scrolling height -->
    <div 
      :style="{ 
        height: `${totalHeight}px`, 
        width: '1px' 
      }"
      class="absolute top-0 left-0"
    ></div>
    
    <!-- Render Layer -->
    <div v-if="layoutResult" class="absolute top-0 left-0 w-full h-full pointer-events-none">
      <CharacterCell
        v-for="item in visibleItems"
        :key="`${item.row}-${item.col}`"
        :char="item.char"
        :width="item.width"
        :height="item.height"
        :font-size="layoutConfig.fontSize"
        :style="{
          position: 'absolute',
          transform: `translate(${item.x}px, ${item.y}px)`,
          willChange: 'transform',
          fontFamily: configStore.currentFont || 'inherit' // Apply Font
        }"
        :show-grid="configStore.borderMode !== 'none'" 
        :grid-type="configStore.gridType"
        :grid-color="'var(--color-grid)'"
      />
    </div>
    
    <!-- Empty State -->
    <div 
      v-else 
      class="flex items-center justify-center w-full h-full text-[var(--color-text-light)]"
    >
      <p>请选择一首诗词</p>
    </div>
  </div>
</template>
