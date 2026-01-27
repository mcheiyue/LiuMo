<script setup lang="ts">
import CharacterCell from './CharacterCell.vue';
import { ref, computed, watch, nextTick } from 'vue';
import { useElementSize } from '@vueuse/core';
import { calculateGridDimensions, calculateLayout, CELL_SIZE, type LayoutConfig, type CellData } from '../utils/layoutEngine';

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
  viewMode?: 'continuous' | 'paged';
}>(), {
  gridType: 'mizi',
  borderMode: 'full',
  layoutDirection: 'vertical',
  verticalColumnOrder: 'rtl',
  smartSnap: true,
  fixedGrid: () => ({ enabled: false, rows: 10, cols: 6 }),
  viewMode: 'continuous'
});

const containerRef = ref<HTMLElement | null>(null);
const { width: containerWidth, height: containerHeight } = useElementSize(containerRef);

// CRITICAL FIX for Vertical Layout:
// useElementSize returns VIEWPORT size, not content size.
// In Vertical mode with horizontal scroll, containerWidth is capped at viewport width.
// This causes gridDimensions to underestimate cols, leading to truncated red background.
// SOLUTION: Use a fixed/large reference dimension for Vertical, ignore containerWidth.

const effectiveContainerWidth = computed(() => {
   if (props.layoutDirection === 'vertical') {
       // Vertical: Ignore viewport width. Use a large reference (or calculate from text length).
       // We'll let layoutDimensions handle the expansion properly.
       return 100000; // Arbitrarily large to prevent clamping
   } else {
       return containerWidth.value || 1000;
   }
});

const effectiveContainerHeight = computed(() => {
   if (props.layoutDirection === 'horizontal') {
       return 100000; // Same logic for horizontal overflow
   } else {
       return containerHeight.value || 800;
   }
});

// Helper to calc page capacity (Screen Page Size)
const pageCapacity = computed(() => {
   const padding = 64;
   const w = Math.max(0, (containerWidth.value || 1000) - padding);
   const h = Math.max(0, (containerHeight.value || 800) - padding);
   // Gap approx 1px for full grid, 0 for none. Assume 1px safety.
   const size = CELL_SIZE + 1;
   return {
     cols: Math.floor(w / size),
     rows: Math.floor(h / size)
   };
});

// Layout Calculation
const layoutConfig = computed<LayoutConfig>(() => {
  // In Paged Mode, force fixed grid based on screen capacity (simulate pagination)
  let activeFixedGrid = props.fixedGrid;
  
  if (props.viewMode === 'paged') {
     // If user hasn't forced a manual grid, use "Screen Capacity" as the page size
     if (!props.fixedGrid?.enabled) {
         activeFixedGrid = {
             enabled: true,
             rows: Math.max(1, pageCapacity.value.rows),
             cols: Math.max(1, pageCapacity.value.cols)
         };
     }
  }

  return {
      layoutDirection: props.layoutDirection,
      verticalColumnOrder: props.verticalColumnOrder,
      borderMode: props.borderMode,
      smartSnap: props.smartSnap,
      fixedGrid: activeFixedGrid
  };
});

const gridDimensions = computed(() => {
  return calculateGridDimensions(
    props.text,
    effectiveContainerWidth.value, // Use effective dimensions to avoid viewport capping
    effectiveContainerHeight.value,
    64, // PADDING = 64
    layoutConfig.value
  );
});

// Dynamic Layout Dimensions (Auto-expand for Infinite Scroll)
const layoutDimensions = computed(() => {
  const dims = { ...gridDimensions.value };
  
  // Only expand dimensions if in Continuous Mode
  if (props.viewMode === 'continuous') {
      // Ensure we have at least 1 char length to avoid division by zero or empty grid
      const len = Math.max(props.text.length, 1);
      
      if (props.layoutDirection === 'vertical') {
          // Vertical: Rows fixed to screen height, Cols expand
          const neededCols = Math.ceil(len / Math.max(1, dims.rows));
          dims.cols = Math.max(dims.cols, neededCols);
      } else {
          // Horizontal: Cols fixed to screen width, Rows expand
          const neededRows = Math.ceil(len / Math.max(1, dims.cols));
          dims.rows = Math.max(dims.rows, neededRows);
      }
  }
  // For 'paged' mode, we strictly respect gridDimensions (which represents ONE PAGE)
  
  return dims;
});

const layoutData = computed(() => {
  return calculateLayout(
    props.text,
    layoutDimensions.value, // Use expanded dimensions
    layoutConfig.value
  );
});

// Group by Page
const pages = computed(() => {
  if (props.viewMode !== 'paged') return [];
  
  // Group cells by pageIndex
  const groups: CellData[][] = [];
  layoutData.value.forEach(cell => {
      if (!groups[cell.pageIndex]) groups[cell.pageIndex] = [];
      groups[cell.pageIndex].push(cell);
  });
  return groups;
});

// Canvas Size Calculation
const canvasStyle = computed(() => {
  const { cols, rows, gap } = layoutDimensions.value; 
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
      // If the last cell is at maxRight, we might want one last gap? No.
      // But we definitely need to cover it.
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
  <!-- Outer Scroll Container -->
  <!-- FORCE LTR direction to avoid browser inconsistencies with RTL scrolling -->
  <div 
    ref="containerRef"
    class="bg-stone-200 w-full h-full absolute inset-0 flex p-8"
    :class="layoutDirection === 'vertical' ? 'overflow-x-auto' : 'overflow-y-auto'"
    style="direction: ltr;"
  >
    <!-- Relative Canvas (Continuous) -->
    <div 
      v-if="viewMode === 'continuous'"
      class="relative transition-all duration-300 ease-out m-auto shadow-lg flex-shrink-0"
      :style="canvasStyle"
    >
      <!-- Font Injection -->
      <component :is="'style'" v-if="fontFaceCss">{{ fontFaceCss }}</component>

      <!-- Cells -->
      <CharacterCell 
        v-for="(cell, index) in layoutData" 
        :key="index"
        :char="cell.char"
        :grid-type="gridType"
        :show-grid="borderMode === 'full'" 
        class="bg-paper"
        :style="{
          position: 'absolute',
          left: `${cell.x}px`,
          top: `${cell.y}px`,
          width: `${cell.size}px`,
          height: `${cell.size}px`
        }"
      />
    </div>

    <!-- Paged View -->
    <div v-else class="flex flex-col gap-8 items-center py-8 w-full">
       <component :is="'style'" v-if="fontFaceCss">{{ fontFaceCss }}</component>
       
       <div 
         v-for="(pageCells, pIdx) in pages" 
         :key="pIdx"
         class="relative bg-white shadow-lg transition-all duration-300 ease-out flex-shrink-0"
         :style="canvasStyle" 
       >
          <!-- 
            canvasStyle calculates width/height based on gridDimensions.
            In Paged Mode, gridDimensions represents ONE PAGE. 
            So this works perfectly. 
          -->
          <CharacterCell 
            v-for="(cell, index) in pageCells" 
            :key="index"
            :char="cell.char"
            :grid-type="gridType"
            :show-grid="borderMode === 'full'" 
            class="bg-paper"
            :style="{
              position: 'absolute',
              left: `${cell.x}px`,
              top: `${cell.y}px`,
              width: `${cell.size}px`,
              height: `${cell.size}px`
            }"
          />
          
          <!-- Page Number -->
          <div class="absolute -bottom-6 left-0 right-0 text-center text-xs text-stone-400">
            第 {{ pIdx + 1 }} 页
          </div>
       </div>
    </div>
  </div>
</template>
