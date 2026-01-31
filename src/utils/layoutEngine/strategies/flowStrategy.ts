import type { ILayoutStrategy, LayoutResult, StructuredContent, LayoutConfig, RenderItem } from '../types';
import { getViewportItems } from '../virtualScroll';

export const flowStrategy: ILayoutStrategy = {
  calculate(content: StructuredContent, config: LayoutConfig): LayoutResult {
    const { 
      isVertical, 
      paddingTop, 
      paddingBottom, 
      paddingLeft, 
      paddingRight, 
      gap = 0,
      columns,
      maxRows,
      fontSize: baseFontSize,
      gridSize
    } = config;

    const items: RenderItem[] = [];
    const lineOffsets: number[] = [];
    
    // Force usage of gridSize, fallback to 20 if missing
    const cellSize = gridSize || 20;
    
    // Fixed gap logic: Always preserve gap space regardless of border mode
    const gapX = gap;
    const gapY = gap;
    
    // Uniform steps
    const stepX = cellSize + gapX;
    const stepY = cellSize + gapY;

    // Safety check for columns in horizontal mode
    const safeColumns = (!isVertical && columns && columns < 4) ? 20 : (columns || 20);

    // Page Limits (Pixel based)
    const pageLimit = isVertical 
      ? (maxRows || 20) * stepY
      : safeColumns * stepX;

    let logicalLine = 0; // Index of the line/column
    let cursor = 0; // Position within the line/column (pixels)
    
    let maxContentMain = 0; 
    let maxContentCross = 0; 

    for (const para of content.paragraphs) {
      let scale = 1;
      if (para.type === 'small' || para.type === 'note') scale = 0.7;
      else if (para.type === 'preface') scale = 0.8;

      const pFontSize = baseFontSize * scale;

      // New logical line for new paragraph (unless first)
      if (cursor > 0) {
        logicalLine++;
        cursor = 0;
      }

      for (const line of para.lines) {
        // Explicit line break from source
        if (cursor > 0) {
            logicalLine++;
            cursor = 0;
        }

        if (!isVertical) {
             const currentY = paddingTop + logicalLine * stepY;
             lineOffsets.push(currentY);
        }

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          // Uniform step size for ALL characters
          const itemAdvance = isVertical ? stepY : stepX;
          
          // Wrap Check
          if (cursor + itemAdvance > pageLimit + 0.1) {
             logicalLine++;
             cursor = 0;
             if (!isVertical) lineOffsets.push(paddingTop + logicalLine * stepY);
          }

          // Calculate Coordinates
          let x, y;
          
          if (isVertical) {
             // Vertical Layout
             x = paddingLeft + logicalLine * stepX;
             y = paddingTop + cursor;
             
             maxContentCross = Math.max(maxContentCross, x + cellSize); 
             maxContentMain = Math.max(maxContentMain, y + cellSize);   
          } else {
             // Horizontal Layout
             x = paddingLeft + cursor;
             y = paddingTop + logicalLine * stepY;
             
             maxContentMain = Math.max(maxContentMain, x + cellSize);   
             maxContentCross = Math.max(maxContentCross, y + cellSize); 
          }

          items.push({
            char,
            x,
            y,
            row: isVertical ? Math.round(cursor / stepY) : logicalLine,
            col: isVertical ? logicalLine : Math.round(cursor / stepX),
            paragraphType: para.type,
            width: cellSize,    // Forced Size
            height: cellSize,   // Forced Size
            fontSize: pFontSize // Scaled font size inside the fixed cell
          });

          cursor += itemAdvance;
        }
      }
    }
    
    // Post-processing for Vertical RTL
    if (isVertical && config.verticalColumnOrder !== 'ltr') {
       const contentWidth = maxContentCross - paddingLeft;
       for (const item of items) {
           const relX = item.x - paddingLeft;
           // Simple mirror logic for fixed grid
           item.x = paddingLeft + (contentWidth - relX - cellSize);
       }
    }

    return {
      items,
      totalWidth: isVertical ? maxContentCross + paddingRight : maxContentMain + paddingRight,
      totalHeight: isVertical ? maxContentMain + paddingBottom : maxContentCross + paddingBottom,
      lineOffsets,
      getViewportItems: (scrollTop, viewHeight) => 
        getViewportItems(items, scrollTop, viewHeight)
    };
  }
};
