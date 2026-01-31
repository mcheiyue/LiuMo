<script setup lang="ts">
import { ref, computed, watchEffect, watch, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { useElementSize } from '@vueuse/core';
import { usePoetryStore } from '@/stores/poetry';
import { useConfigStore } from '@/stores/config'; // Import ConfigStore
import { useLayoutEngine } from '@/utils/layoutEngine';
import CharacterCell from './CharacterCell.vue';

const containerRef = ref<HTMLElement>();
const { width: containerWidth, height: containerHeight } = useElementSize(containerRef);
const scrollTop = ref(0);

const poetryStore = usePoetryStore();
const configStore = useConfigStore(); // Use ConfigStore
const { config: layoutConfig, calculate } = useLayoutEngine();

// Bridge: Sync ConfigStore -> LayoutEngine Config
const { 
  layoutDirection, 
  verticalColumnOrder, 
  borderMode, 
  gridType, 
  fixedGrid 
} = storeToRefs(configStore);

// Dynamic Layout Calculation
const dynamicColumns = computed(() => {
  const currentConfig = layoutConfig.value;
  const padding = currentConfig.paddingLeft + currentConfig.paddingRight;
  const gap = borderMode.value === 'none' ? 0 : 3;
  const itemSize = currentConfig.gridSize + gap;
  
  if (configStore.fixedGrid.enabled && layoutDirection.value === 'horizontal') {
    return configStore.fixedGrid.cols || 10;
  }
  
  const width = containerWidth.value;
  if (width <= 0) return 10; // Default fallback
  
  return Math.max(1, Math.floor((width - padding) / itemSize));
});

const dynamicRows = computed(() => {
  const currentConfig = layoutConfig.value;
  const padding = currentConfig.paddingTop + currentConfig.paddingBottom;
  const gap = borderMode.value === 'none' ? 0 : 3;
  const itemSize = currentConfig.gridSize + gap;
  
  if (configStore.fixedGrid.enabled && configStore.fixedGrid.rows) {
    return configStore.fixedGrid.rows;
  }
  
  const height = containerHeight.value;
  if (height <= 0) return 10; // Default fallback

  return Math.max(1, Math.floor((height - padding) / itemSize));
});

watchEffect(() => {
  // Map ConfigStore fields to LayoutConfig
  const gap = borderMode.value === 'none' ? 0 : 3;
  
  layoutConfig.value = {
    ...layoutConfig.value,
    layoutDirection: layoutDirection.value,
    verticalColumnOrder: verticalColumnOrder.value,
    borderMode: borderMode.value,
    gridType: gridType.value,
    gap,
    fixedGrid: fixedGrid.value,
    // For horizontal layout, columns controls the wrapping width
    // For vertical layout, we might use this as 'rows' logically or columns (x-axis count)
    // Based on requirements: "columns field usage: layoutDirection.value === 'horizontal' ? dynamicColumns.value : dynamicColumns.value"
    // Wait, the requirement says "layoutDirection.value === 'horizontal' ? dynamicColumns.value : dynamicColumns.value"
    // which simplifies to just dynamicColumns.value.
    // However, the text also says "(Note: in vertical mode this columns param actually represents column count (x-axis count), needs Phase 3 logic. For now set to dynamicColumns to ensure width adaptation)"
    columns: dynamicColumns.value,
    maxRows: dynamicRows.value
  };
});

// Recalculate layout when content or config changes
const layoutResult = computed(() => {
  if (!poetryStore.parsedContent) return null;
  return calculate(poetryStore.parsedContent, layoutConfig.value);
});

const totalHeight = computed(() => layoutResult.value?.totalHeight || 0);
const totalWidth = computed(() => layoutResult.value?.totalWidth || 0);

const visibleItems = computed(() => {
  if (!layoutResult.value) return [];
  // Use containerHeight instead of viewHeight
  return layoutResult.value.getViewportItems(scrollTop.value, containerHeight.value || 800);
});

const gridLayerStyle = computed(() => {
  const config = layoutConfig.value;
  const {
    paddingLeft = 0,
    paddingTop = 0,
    paddingRight = 0,
    paddingBottom = 0,
    borderMode,
    layoutDirection,
    gridSize,
    gap = 0,
    verticalColumnOrder,
    isVertical
  } = config;
  
  const width = Math.max(0, totalWidth.value - paddingLeft - paddingRight);
  const height = Math.max(0, totalHeight.value - paddingTop - paddingBottom);
  
  const style: Record<string, string> = {
    left: `${paddingLeft}px`,
    top: `${paddingTop}px`,
    width: `${width}px`,
    height: `${height}px`,
    backgroundColor: 'transparent',
  };
  
  if (borderMode === 'none') return style;

  const cinnabar = 'var(--color-cinnabar)';
  const transparent = 'transparent';
  const unitSize = gridSize + gap;

  if (borderMode === 'lines-only') {
    if (layoutDirection === 'horizontal') {
       // Horizontal lines (rows)
       style.backgroundImage = `linear-gradient(to bottom, ${transparent} ${gridSize}px, ${cinnabar} ${gridSize}px, ${cinnabar} ${unitSize}px, ${transparent} ${unitSize}px)`;
       style.backgroundSize = `100% ${unitSize}px`;
    } else {
       // Vertical lines (cols)
       style.backgroundImage = `linear-gradient(to right, ${transparent} ${gridSize}px, ${cinnabar} ${gridSize}px, ${cinnabar} ${unitSize}px, ${transparent} ${unitSize}px)`;
       style.backgroundSize = `${unitSize}px 100%`;
       
       if (verticalColumnOrder === 'rtl') {
         style.backgroundPosition = 'right top';
       }
    }
  } else if (borderMode === 'full') {
    const hGrad = `linear-gradient(to bottom, ${transparent} ${gridSize}px, ${cinnabar} ${gridSize}px, ${cinnabar} ${unitSize}px, ${transparent} ${unitSize}px)`;
    const vGrad = `linear-gradient(to right, ${transparent} ${gridSize}px, ${cinnabar} ${gridSize}px, ${cinnabar} ${unitSize}px, ${transparent} ${unitSize}px)`;
    
    style.backgroundImage = `${hGrad}, ${vGrad}`;
    style.backgroundSize = `100% ${unitSize}px, ${unitSize}px 100%`;
    
    if (isVertical && verticalColumnOrder === 'rtl') {
       style.backgroundPosition = 'right top';
    }
  }

  return style;
});

const onScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  scrollTop.value = target.scrollTop;
};

// No ResizeObserver needed anymore thanks to useElementSize

watch(() => layoutConfig.value, (newConfig) => {
  if (newConfig.isVertical && newConfig.verticalColumnOrder === 'rtl') {
    nextTick(() => {
      if (containerRef.value) {
        containerRef.value.scrollLeft = containerRef.value.scrollWidth;
      }
    });
  }
}, { deep: true, immediate: true });

</script>

<template>
  <div 
    ref="containerRef" 
    class="relative w-full h-full overflow-auto bg-[var(--color-paper)] flex transition-colors duration-300"
    @scroll="onScroll"
  >
    <!-- Content Wrapper with auto margins for centering -->
    <div 
      v-if="layoutResult"
      class="relative m-auto flex-shrink-0 transition-all duration-300 ease-out box-content"
      :style="{ 
        width: `${totalWidth}px`, 
        height: `${totalHeight}px`,
      }"
    >
      <!-- Red Background Layer (The Grid Lines) -->
      <!-- Only visible within the content area minus padding -->
      <div 
        v-if="layoutConfig.borderMode !== 'none'"
        class="absolute rounded-sm transition-all duration-300"
        :style="gridLayerStyle"
      ></div>

      <!-- Render Items -->
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
          fontFamily: configStore.currentFont || 'inherit'
        }"
        :border-mode="layoutConfig.borderMode"
        :show-grid="layoutConfig.borderMode === 'full'"
        :grid-type="(layoutConfig.gridType as any)"
        :grid-color="'var(--color-grid)'"
      />
    </div>

    <!-- Empty State -->
    <div 
      v-else 
      class="m-auto text-[var(--color-text-light)]"
    >
      <p>请选择一首诗词</p>
    </div>
  </div>
</template>
