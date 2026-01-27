
// Constants (Matching PaperCanvas.vue)
export const CELL_SIZE = 96;
// PADDING is usually 64 (32px * 2), but we let the caller define it
// In PaperCanvas it was const PADDING = 64;

export interface LayoutConfig {
  layoutDirection: 'vertical' | 'horizontal';
  verticalColumnOrder?: 'rtl' | 'ltr';
  borderMode: 'full' | 'lines-only' | 'none';
  smartSnap: boolean;
  fixedGrid?: { enabled: boolean; rows: number; cols: number };
}

export interface GridDimensions {
  rows: number;
  cols: number;
  gap: number;
  usableWidth: number;
  usableHeight: number;
}

export interface CellData {
  char: string;
  x: number;
  y: number;
  size: number;
  pageIndex: number;
  colIndex: number; // Logical column index
  rowIndex: number; // Logical row index
}

/**
 * Detect poetry structure to automatically snap rows/cols
 */
export function detectSmartLineLength(text: string): number | null {
  if (!text) return null;
  const segments = text.split(/[，。！？,!.?\n\s]+/).filter(s => s.length > 0);
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

  // If >50% of lines have the same length (e.g. 5 or 7 chars), assume poetry
  // Return mode + 1 (for punctuation space usually, or just breathing room)
  // Logic from PaperCanvas: return mode + 1
  if (maxCount / segments.length > 0.5 && mode >= 2 && mode <= 14) {
    return mode + 1; 
  }
  return null;
}

/**
 * Calculate Grid Rows/Cols based on container size and config
 */
export function calculateGridDimensions(
  text: string, 
  containerWidth: number, 
  containerHeight: number, 
  padding: number,
  config: LayoutConfig
): GridDimensions {
  const isVertical = config.layoutDirection === 'vertical';
  
  // Gap Logic
  let gap = 0;
  if (config.borderMode === 'full') gap = 3; // Increase visibility to 3px
  else if (config.borderMode === 'lines-only') gap = 3; 

  // 1. Manual Override
  if (config.fixedGrid && config.fixedGrid.enabled) {
    let rows = Math.max(1, config.fixedGrid.rows || 10);
    let cols = Math.max(1, config.fixedGrid.cols || 6);

    if (isVertical) {
        // Vertical: Fixed rows (height), auto cols
        rows = config.fixedGrid.rows;
        cols = Math.ceil(text.length / rows);
    } else {
        // Horizontal: Fixed cols (width), auto rows
        cols = config.fixedGrid.cols;
        rows = Math.ceil(text.length / cols);
    }
    
    rows = Math.max(1, rows);
    cols = Math.max(1, cols);
    
    return { 
      rows, 
      cols, 
      gap,
      usableWidth: containerWidth - padding,
      usableHeight: containerHeight - padding
    };
  }

  // 2. Auto / Smart Logic
  const usableW = Math.max(0, containerWidth - padding);
  const usableH = Math.max(0, containerHeight - padding);
  const smartLen = config.smartSnap ? detectSmartLineLength(text) : null;

  let cols = 0;
  let rows = 0;

  if (isVertical) {
    const maxFitRows = Math.floor((usableH + gap) / (CELL_SIZE + gap));
    if (smartLen && smartLen <= maxFitRows) {
        rows = smartLen;
    } else {
        rows = Math.max(1, maxFitRows);
    }
    cols = Math.ceil(text.length / rows);
  } else {
    const maxFitCols = Math.floor((usableW + gap) / (CELL_SIZE + gap));
    if (smartLen && smartLen <= maxFitCols) {
        cols = smartLen;
    } else {
        cols = Math.max(1, maxFitCols);
    }
    rows = Math.ceil(text.length / cols);
  }

  return { rows, cols, gap, usableWidth: usableW, usableHeight: usableH };
}

/**
 * Core Layout Calculation: Returns absolute positions for every character
 * This replaces the browser's CSS Grid auto-placement
 */
export function calculateLayout(
  text: string,
  grid: GridDimensions,
  config: LayoutConfig
): CellData[] {
  const { rows, cols, gap } = grid;
  const isVertical = config.layoutDirection === 'vertical';
  const isRtl = config.verticalColumnOrder === 'rtl'; // Only relevant if vertical
  
  // Calculate total cells needed based on text length
  // If one dimension is huge (virtual infinite), we clamp it to text length
  // Otherwise (Finite Grid), we generate enough pages to fit text
  
  const charsPerPage = rows * cols;
  let totalCells = 0;
  
  const isInfiniteRows = grid.rows > 10000;
  const isInfiniteCols = grid.cols > 10000;
  const isInfinite = isInfiniteRows || isInfiniteCols;
  
  if (isInfinite) {
      // Dynamic calculation for infinite scroll/PDF export (Continuous Mode)
      const len = Math.max(text.length, 1); // Ensure at least 1 cell
      
      if (isVertical) {
          // Vertical: Fixed rows, dynamic cols
          const neededCols = Math.ceil(len / grid.rows);
          totalCells = neededCols * grid.rows;
      } else {
          // Horizontal: Fixed cols, dynamic rows
          const neededRows = Math.ceil(len / grid.cols);
          totalCells = neededRows * grid.cols;
      }
  } else {
      // Finite Grid (Paged Mode)
      // Generate full pages
      const len = Math.max(text.length, 1);
      const totalPages = Math.ceil(len / charsPerPage);
      totalCells = totalPages * charsPerPage;
  }
  
  const cells: CellData[] = [];

  for (let i = 0; i < totalCells; i++) {
    // If text ends, we still generate cells (empty grids)
    const char = text[i] || '';
    
    // Calculate Logical Position (col, row)
    // CSS Grid `grid-auto-flow: column` (Vertical) vs `row` (Horizontal)
    
    let colIdx = 0;
    let rowIdx = 0;
    
    // Page Index Calculation
    let pageIndex = 0;
    let indexInPage = i;
    
    if (!isInfinite) {
        pageIndex = Math.floor(i / charsPerPage);
        indexInPage = i % charsPerPage;
    }
    
    if (isVertical) {
      // Flow: Column by Column
      // DOM order fills Column 1, then Column 2...
      // i = col * rows + row
      // Note: grid.rows is "Rows Per Page/Strip"
      colIdx = Math.floor(indexInPage / rows);
      rowIdx = indexInPage % rows;
    } else {
      // Flow: Row by Row
      // i = row * cols + col
      rowIdx = Math.floor(indexInPage / cols);
      colIdx = indexInPage % cols;
    }
    
    // Calculate Visual Position (x, y)
    // Visual Column Index
    let visualColIdx = colIdx;
    if (isVertical && isRtl) {
      visualColIdx = (cols - 1) - colIdx;
    }
    
    // Visual Row Index (always top to bottom)
    const visualRowIdx = rowIdx;
    
    // Gap logic correction from PaperCanvas gridStyle:
    let effectiveRowGap = gap;
    let effectiveColGap = gap;
    
    if (config.borderMode === 'lines-only') {
      if (isVertical) {
        effectiveRowGap = 0;
        effectiveColGap = gap;
      } else {
        effectiveRowGap = gap;
        effectiveColGap = 0;
      }
    } else if (config.borderMode === 'none') {
        effectiveRowGap = 0;
        effectiveColGap = 0;
    }
    
    const x = visualColIdx * (CELL_SIZE + effectiveColGap);
    const y = visualRowIdx * (CELL_SIZE + effectiveRowGap);
    
    cells.push({
      char,
      x,
      y,
      size: CELL_SIZE,
      pageIndex: pageIndex, 
      colIndex: colIdx, // Note: This is page-relative col index now? 
                        // For Infinite scroll, pageIndex=0, so it's global.
                        // For Paged mode, it's page-relative.
                        // exporter.ts expects GLOBAL colIndex for infinite scroll logic?
                        // exporter.ts pagination logic:
                        // pIndex = Math.floor(cell.colIndex / colsPerPage);
                        // If cell.colIndex is page-relative (0..cols-1), pIndex will be 0.
                        // So exporter.ts logic BREAKS if I change this to page-relative.
                        
                        // BUT, exporter.ts uses "Infinite Mode" (isVertical ? 999999 cols).
                        // So isInfinite=true.
                        // So pageIndex=0. indexInPage=i.
                        // So colIdx = i / rows. This is GLOBAL.
                        // So exporter.ts is SAFE.
                        
                        // For Paged Mode (Screen Preview), colIdx is Page-Relative.
                        // This is correct.
      rowIndex: rowIdx
    });
  }
  
  return cells;
}
