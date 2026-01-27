<script setup lang="ts">
import CharacterCell from './CharacterCell.vue';
import { ref, computed, watch, nextTick } from 'vue';
import { useElementSize } from '@vueuse/core';
import { calculateGridDimensions, calculateLayout, CELL_SIZE, type LayoutConfig } from '../utils/layoutEngine';

const props = withDefaults(defineProps<{
  text: string;
  fontFamily?: string;
  gridType?: 'mizi' | 'tianzi' | 'huigong' | 'none';
  borderMode?: 'full' | 'lines-only' | 'none';
  layoutDirection?: 'vertical' | 'horizontal';
  verticalColumnOrder?: 'rtl' | 'ltr';
  smartSnap?: boolean;
  fixedGrid?: { enabled: boolean; rows: number; cols: number };
  fontFaceCss?: string;
}>(), {
  gridType: 'mizi',
  borderMode: 'full',
  layoutDirection: 'vertical',
  verticalColumnOrder: 'rtl',
  smartSnap: true,
  fixedGrid: () => ({ enabled: false, rows: 10, cols: 6 }),
});

const containerRef = ref<HTMLElement | null>(null);
const { width: containerWidth, height: containerHeight } = useElementSize(containerRef);

// Layout Calculation
const layoutConfig = computed<LayoutConfig>(() => {
  return {
      layoutDirection: props.layoutDirection,
      verticalColumnOrder: props.verticalColumnOrder,
      borderMode: props.borderMode,
      smartSnap: props.smartSnap,
      fixedGrid: props.fixedGrid
  };
});


const gridDimensions = computed(() => {
  return calculateGridDimensions(
    props.text,
    containerWidth.value || 1000,
    containerHeight.value || 800,
    64, // PADDING = 64
    layoutConfig.value
  );
});

// Dynamic Layout Dimensions (Auto-expand for Infinite Scroll)
const layoutDimensions = computed(() => {
  const dims = { ...gridDimensions.value };
  
  // Always expand dimensions (Continuous Mode only now)
  // Ensure we have at least 1 char length to avoid division by zero or empty grid
  const len = Math.max(props.text.length, 1);
  
  if (props.layoutDirection === 'vertical') {
      // Vertical: Rows fixed to screen height, Cols expand
      // Fix: Use exact needed columns to avoid huge empty space
      const neededCols = Math.ceil(len / Math.max(1, dims.rows));
      // CRITICAL FIX: Ensure at least Screen Cols to fill viewport, but expand if text is longer
      dims.cols = Math.max(dims.cols, neededCols);
  } else {
      // Horizontal: Cols fixed to screen width, Rows expand
      const neededRows = Math.ceil(len / Math.max(1, dims.cols));
      dims.rows = Math.max(dims.rows, neededRows);
  }

  return dims;
});


const layoutData = computed(() => {

  return calculateLayout(
    props.text,
    layoutDimensions.value, // Use expanded dimensions
    layoutConfig.value
  );
});

const shouldShowBorder = computed(() => {
  return props.borderMode !== 'none';
});

  // Canvas Size Calculation
  const canvasStyle = computed(() => {
  // Always Continuous Mode
  const dims = layoutDimensions.value;
  
  const { cols, rows, gap } = dims; 
  const isVertical = props.layoutDirection === 'vertical';

  // Gap Logic (Matching layoutEngine logic)

  let effectiveRowGap = gap;
  let effectiveColGap = gap;
    
  if (props.borderMode === 'lines-only') {
      if (isVertical) {
        effectiveRowGap = 0;
        effectiveColGap = gap;
      } else {
        effectiveRowGap = gap;
        effectiveColGap = 0;
      }
  } else if (props.borderMode === 'none') {
      effectiveRowGap = 0;
      effectiveColGap = 0;
  }

  // Base dimensions from logic
  let widthPx = cols * CELL_SIZE + Math.max(0, cols - 1) * effectiveColGap;
  let heightPx = rows * CELL_SIZE + Math.max(0, rows - 1) * effectiveRowGap;

  // AUTO-FIT FIX: Ensure container covers all actual cells
  // This handles RTL/mixed layout edge cases where logical cols != visual extent
  if (layoutData.value.length > 0) {
      let maxRight = 0;
      let maxBottom = 0;
      // Sampling check is risky, full scan is safe and fast enough (<1ms for 10k items)
      for (const cell of layoutData.value) {
          const r = Math.ceil(cell.x + cell.size);
          const b = Math.ceil(cell.y + cell.size);
          if (r > maxRight) maxRight = r;
          if (b > maxBottom) maxBottom = b;
      }
      
      // Add gap buffer to the extent
      widthPx = Math.max(widthPx, maxRight);
      heightPx = Math.max(heightPx, maxBottom);
  }

  // No buffer needed - exact fit avoids red lines at edges
  return {
    width: `${widthPx}px`,
    height: `${heightPx}px`,
    backgroundColor: '#D58B85',
    fontFamily: props.fontFamily ? `'${props.fontFamily}', serif` : 'inherit',
  };
});


// Auto-scroll logic for RTL
watch(
  () => [props.layoutDirection, props.verticalColumnOrder, gridDimensions.value], 
  () => {
    if (props.layoutDirection === 'vertical' && props.verticalColumnOrder === 'rtl') {
       nextTick(() => {
           if (containerRef.value) {
               // Scroll to Right (Initial position for RTL)
               containerRef.value.scrollLeft = containerRef.value.scrollWidth;
           }
       });
    } else {
       // Scroll to Top/Left
       nextTick(() => {
           if (containerRef.value) {
               containerRef.value.scrollLeft = 0;
               containerRef.value.scrollTop = 0;
           }
       });
    }
  },
  { flush: 'post' } // Ensure DOM is updated
);
</script>

<template>
  <!-- Use justify-start or margin-auto to prevent center-clipping -->
  <div class="w-full h-full overflow-auto flex p-8 bg-stone-300 relative" ref="containerRef">
    <!-- Continuous Scroll Mode -->
    <div 
        class="bg-white shadow-lg relative transition-all duration-300 ease-in-out border border-stone-200 shrink-0 mx-auto"
        :style="canvasStyle"
    >
      <CharacterCell 
        v-for="(cell, index) in layoutData" 
        :key="`${cell.char}-${index}`"
        :char="cell.char"
        :size="cell.size"
        :font-family="fontFamily"
        :grid-type="gridType"
        :show-grid="props.borderMode === 'full'"
        grid-color="#B22222"
        :show-border="shouldShowBorder"
        :style="{
            position: 'absolute',
            left: `${cell.x}px`,
            top: `${cell.y}px`,
            width: `${cell.size}px`,
            height: `${cell.size}px`,
            // Fix: Remove transition for infinite scroll to prevent janky reflows on typing
            // transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)' 
        }"
      />
      <!-- Grid Overlay / Background could be drawn here if needed globally -->
    </div>

  </div>
</template>