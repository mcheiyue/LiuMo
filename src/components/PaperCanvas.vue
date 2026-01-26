<script setup lang="ts">
import CharacterCell from './CharacterCell.vue';
import { ref, computed } from 'vue';
import { useElementSize } from '@vueuse/core';

const props = withDefaults(defineProps<{
  text: string;
  fontFamily?: string;
  gridType?: 'mizi' | 'tianzi' | 'huigong' | 'none';
  borderMode?: 'full' | 'lines-only' | 'none';
  layoutDirection?: 'vertical' | 'horizontal';
  verticalColumnOrder?: 'rtl' | 'ltr';
  smartSnap?: boolean;
  fixedGrid?: { enabled: boolean; rows: number; cols: number };
}>(), {
  gridType: 'mizi',
  borderMode: 'full',
  layoutDirection: 'vertical',
  verticalColumnOrder: 'rtl',
  smartSnap: true,
  fixedGrid: () => ({ enabled: false, rows: 10, cols: 6 })
});

const contentRef = ref<HTMLElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const { width: containerWidth, height: containerHeight } = useElementSize(containerRef);

// Constants
const CELL_SIZE = 96;
const PADDING = 64; // p-8 = 32px * 2 = 64px

// Smart Layout Logic: Detect poetry structure
const detectedLineLength = computed(() => {
  if (!props.smartSnap || !props.text) return null;
  // ... (keep existing logic)
  const segments = props.text.split(/[，。！？,!.?\n\s]+/).filter(s => s.length > 0);
  if (segments.length === 0) return null;

  const lengths = segments.map(s => s.length);
  const freq: Record<number, number> = {};
  lengths.forEach(l => freq[l] = (freq[l] || 0) + 1);
  
  let mode = 0;
  let maxCount = 0;
  for (const len in freq) {
    if (freq[len] > maxCount) {
      maxCount = freq[len];
      mode = Number(len);
    }
  }

  if (maxCount / segments.length > 0.5 && mode >= 2 && mode <= 14) {
    return mode + 1; 
  }
  return null;
});

// Calculate Grid Dimensions
const gridDimensions = computed(() => {
  const isVertical = props.layoutDirection === 'vertical';
  
  // 1. Manual Override (Highest Priority)
  // Safety check: fixedGrid might be undefined if persistence migration failed
  if (props.fixedGrid && props.fixedGrid.enabled) {
    let rows = Math.max(1, props.fixedGrid.rows || 10);
    let cols = Math.max(1, props.fixedGrid.cols || 6);
    
    // Auto-expand the non-constrained axis if content doesn't fit?
    // Or strictly follow the fixed grid?
    // Usually "Manual" means "I want this specific grid".
    // But if text overflows, we must grow.
    // Let's interpret settings as "Viewport Constraints" or "Page Size".
    
    // Better interpretation for "Fixed Grid":
    // Vertical: rows is fixed (chars per line), cols is auto (lines).
    // Horizontal: cols is fixed (chars per line), rows is auto (lines).
    
    // Wait, the UI has separate rows/cols inputs.
    // If user sets 10x10, they expect 10x10.
    // If text is longer, it scrolls.
    
    // Let's trust the inputs but ensure they are enough to show at least 1 cell.
    // If text overflows, we still need to calculate the *actual* needed grid to render all text.
    // The "Fixed Grid" settings usually define the "View" or "Page" size, 
    // but in a scrolling canvas, "Rows" usually means "Height of column" (in Vertical).
    
    // Let's treat fixedGrid.rows as "Rows per Column" and fixedGrid.cols as "Columns per Row" (viewport size).
    // But since it's a scrolling canvas, one dimension must be flexible.
    
    if (isVertical) {
        // Vertical: User likely wants to fix "Rows" (height/chars per line).
        // Cols should be auto based on text length.
        rows = props.fixedGrid.rows;
        cols = Math.ceil(props.text.length / rows);
        // But if user ALSO wants to force cols (e.g. for a fixed page look), 
        // we can respect that, but text might be hidden if overflow-hidden isn't set.
        // Let's stick to: Fixed dimension defines the "Cross Axis" size.
    } else {
        // Horizontal: User likely wants to fix "Cols" (width/chars per line).
        cols = props.fixedGrid.cols;
        rows = Math.ceil(props.text.length / cols);
    }
    
    // Fallback if inputs are bad
    rows = Math.max(1, rows);
    cols = Math.max(1, cols);
    
    let gap = props.borderMode === 'none' ? 0 : 1;
    return { rows, cols, gap };
  }

  // 2. Auto / Smart Logic (Existing)
  const availW = containerWidth.value || 1000;
  const availH = containerHeight.value || 800;
  
  // Gap size
  let gap = 0;
  if (props.borderMode === 'full') gap = 1;
  else if (props.borderMode === 'lines-only') gap = 1; 

  // Available space for cells
  const usableW = Math.max(0, availW - PADDING);
  const usableH = Math.max(0, availH - PADDING);

  let cols = 0;
  let rows = 0;

  if (isVertical) {
    const maxFitRows = Math.floor((usableH + gap) / (CELL_SIZE + gap));
    
    if (detectedLineLength.value && detectedLineLength.value <= maxFitRows) {
        rows = detectedLineLength.value;
    } else {
        rows = Math.max(1, maxFitRows);
    }
    cols = Math.ceil(props.text.length / rows);
    
  } else {
    const maxFitCols = Math.floor((usableW + gap) / (CELL_SIZE + gap));
    
    if (detectedLineLength.value && detectedLineLength.value <= maxFitCols) {
        cols = detectedLineLength.value;
    } else {
        cols = Math.max(1, maxFitCols);
    }
    rows = Math.ceil(props.text.length / cols);
  }

  return { rows, cols, gap };
});

const gridStyle = computed(() => {
  const { rows, cols, gap } = gridDimensions.value;
  const isVertical = props.layoutDirection === 'vertical';

  // Gap Logic Details
  let gapStyle = `${gap}px ${gap}px`;
  if (props.borderMode === 'lines-only') {
    if (isVertical) gapStyle = `0px ${gap}px`; // No horizontal gaps (rows connected), vertical lines exist
    else gapStyle = `${gap}px 0px`; // No vertical gaps (cols connected), horizontal lines exist
  } else if (props.borderMode === 'none') {
    gapStyle = '0px';
  }

  // Exact pixel dimensions to prevent Red Background leakage
  const widthPx = cols * CELL_SIZE + Math.max(0, cols - 1) * (props.borderMode === 'lines-only' && isVertical ? 1 : (props.borderMode === 'full' ? 1 : 0));
  const heightPx = rows * CELL_SIZE + Math.max(0, rows - 1) * (props.borderMode === 'lines-only' && !isVertical ? 1 : (props.borderMode === 'full' ? 1 : 0));
  
  // Direction handling for Vertical Layout
  // If vertical:
  // - 'rtl' (Traditional): Columns flow Right to Left.
  // - 'ltr' (Modern Vertical): Columns flow Left to Right.
  // const dir = isVertical ? props.verticalColumnOrder : 'ltr';

  return {
    display: 'grid',
    gap: gapStyle,
    fontFamily: props.fontFamily ? `'${props.fontFamily}', serif` : 'inherit',
    
    // Explicit Templates
    gridTemplateRows: `repeat(${rows}, ${CELL_SIZE}px)`,
    gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
    
    // Explicit Dimensions
    width: `${widthPx}px`,
    height: `${heightPx}px`,
    
    // Flow direction
    gridAutoFlow: isVertical ? 'column' : 'row',
    // NO direction here, handled by container
  };
});


defineExpose({
  contentRef
});
</script>

<template>
  <!-- Outer Scroll Container -->
  <!-- Direction logic: 
       Vertical RTL: direction: rtl (Starts right, scrolls left)
       Vertical LTR: direction: ltr (Starts left, scrolls right)
       Horizontal: direction: ltr (Starts top-left)
  -->
  <div 
    ref="containerRef"
    class="bg-stone-200 w-full h-full absolute inset-0 flex p-8"
    :class="layoutDirection === 'vertical' ? 'overflow-x-auto' : 'overflow-y-auto'"
    :style="{ 
      direction: layoutDirection === 'vertical' ? verticalColumnOrder : 'ltr' 
    }"
  >
       
    <!-- Canvas Grid -->
    <!-- m-auto ensures safe centering: centers if smaller, aligns to start if larger/overflowing -->
    <div 
      ref="contentRef"
      class="bg-cinnabar/50 shadow-2xl p-[1px] transition-all duration-300 ease-out m-auto"
      :class="{ 
        'border-none': borderMode === 'none', 
        'p-0 bg-transparent': borderMode === 'none'
      }"
      :style="gridStyle"
    >
      <CharacterCell 
        v-for="n in (gridDimensions.rows * gridDimensions.cols)" 
        :key="n" 
        :char="text[n - 1] || ''"
        :grid-type="gridType"
        :show-grid="borderMode === 'full'" 
        class="bg-paper" 
      />
    </div>
  </div>
</template>
