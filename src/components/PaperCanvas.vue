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
  gridType 
} = storeToRefs(configStore);

// Dynamic Layout Calculation
const dynamicColumns = computed(() => {
  const currentConfig = layoutConfig.value;
  const padding = currentConfig.paddingLeft + currentConfig.paddingRight;
  const gap = borderMode.value === 'none' ? 0 : 3;
  const itemSize = currentConfig.gridSize + gap;
  
  const width = containerWidth.value;
  if (width <= 0) return 20; // Default fallback
  
  // 最小保持 12 列（防止容器过窄导致一字一行的"伪竖排"现象）
  return Math.max(12, Math.floor((width - padding) / itemSize));
});

const dynamicRows = computed(() => {
  const currentConfig = layoutConfig.value;
  const padding = currentConfig.paddingTop + currentConfig.paddingBottom;
  const gap = borderMode.value === 'none' ? 0 : 3;
  const itemSize = currentConfig.gridSize + gap;
  
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
    isVertical: layoutDirection.value === 'vertical',
    verticalColumnOrder: verticalColumnOrder.value,
    borderMode: borderMode.value,
    gridType: gridType.value,
    gap,
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
      gridSize,
      gap = 0,
      verticalColumnOrder,
      isVertical
    } = config;
    
    const width = Math.max(0, totalWidth.value - paddingLeft - paddingRight);
    const height = Math.max(0, totalHeight.value - paddingTop - paddingBottom);
    
    const style: Record<string, string> = {
      position: 'absolute',
      left: `${paddingLeft}px`,
      top: `${paddingTop}px`,
      width: `${width}px`,
      height: `${height}px`,
      backgroundColor: 'transparent',
      zIndex: '0',
      pointerEvents: 'none',
    };
    
    if (borderMode === 'none') return style;

    const cinnabar = 'var(--color-cinnabar)';
    const transparent = 'transparent';
    const unitSize = gridSize + gap;

    // Define gradients with line at the END (Right or Bottom)
    // Line at Right: [Transparent Content][Color Line]
    const lineRight = `linear-gradient(to right, ${transparent} ${gridSize}px, ${cinnabar} ${gridSize}px, ${cinnabar} ${unitSize}px)`;
    // Line at Bottom: [Transparent Content][Color Line]
    const lineBottom = `linear-gradient(to bottom, ${transparent} ${gridSize}px, ${cinnabar} ${gridSize}px, ${cinnabar} ${unitSize}px)`;

    if (borderMode === 'lines-only') {
      if (isVertical) {
         // Vertical layout: we need Vertical Lines (between columns)
         style.backgroundImage = lineRight;
         style.backgroundSize = `${unitSize}px 100%`;
         
         if (verticalColumnOrder === 'rtl') {
           // RTL: Line should be on the LEFT of the column
           // Shift right by gap to hide the right-side line and reveal the previous tile's line on the left
           style.backgroundPosition = `right -${gap}px top 0`;
         } else {
           // LTR: Line should be on the RIGHT of the column
           style.backgroundPosition = 'left top';
         }
      } else {
         // Horizontal layout: we need Horizontal Lines (between rows)
         style.backgroundImage = lineBottom;
         style.backgroundSize = `100% ${unitSize}px`;
         style.backgroundPosition = 'left top';
      }
    } else if (borderMode === 'full') {
      // Full grid: Both horizontal and vertical lines
      // Layer 1: Horizontal lines (lineBottom)
      // Layer 2: Vertical lines (lineRight)
      style.backgroundImage = `${lineBottom}, ${lineRight}`;
      style.backgroundSize = `100% ${unitSize}px, ${unitSize}px 100%`;
      
      if (isVertical && verticalColumnOrder === 'rtl') {
         // Horizontal lines: default; Vertical lines: shifted for RTL
         style.backgroundPosition = `left top, right -${gap}px top 0`;
      } else {
         style.backgroundPosition = 'left top, left top';
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
    class="relative w-full h-full overflow-auto bg-transparent flex transition-colors duration-300"
    @scroll="onScroll"
  >
    <!-- Content Wrapper with auto margins for centering -->
    <div 
      v-if="layoutResult"
      class="relative m-auto flex-shrink-0 transition-all duration-300 ease-out box-content bg-[var(--color-background)]"
      :style="{ 
        width: `${totalWidth}px`, 
        height: `${totalHeight}px`,
        boxShadow: 'var(--shadow-paper)',
        border: 'var(--border-card)'
      }"
    >
      <!-- Red Background Layer (The Grid Lines) -->
      <!-- Only visible within the content area minus padding -->
      <div 
        v-if="layoutConfig.borderMode !== 'none'"
        class="grid-background absolute rounded-sm transition-all duration-300"
        :style="gridLayerStyle"
      ></div>

      <!-- Render Items -->
      <CharacterCell
        v-for="item in visibleItems"
        :key="`${item.row}-${item.col}`"
        :char="item.char"
        :width="item.width"
        :height="item.height"
        :font-size="item.fontSize || layoutConfig.fontSize"
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
