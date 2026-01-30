import type { ILayoutStrategy, LayoutResult, StructuredContent, LayoutConfig, RenderItem } from '../types';
import { getViewportItems } from '../virtualScroll';

export const gridStrategy: ILayoutStrategy = {
  calculate(content: StructuredContent, config: LayoutConfig): LayoutResult {
    const items: RenderItem[] = [];
    const lineOffsets: number[] = [];
    let currentY = config.paddingTop;
    let row = 0;

    for (const para of content.paragraphs) {
      for (const line of para.lines) {
        lineOffsets.push(currentY);
        
        // Center the grid line if needed? Standard Grid usually left aligned or centered block?
        // Let's assume left aligned relative to paddingLeft for now, 
        // or calculate startX to center the block?
        // V7.1 logic was centered block.
        // Let's implement block centering: 
        // Max chars per line for grid is usually fixed (e.g. 5 or 7).
        // content.columns might override? 
        
        // But for Grid Strategy, we assume strict grid.
        // Let's stick to simple left align with paddingLeft for now.
        
        for (let col = 0; col < line.length; col++) {
          items.push({
            char: line[col],
            x: config.paddingLeft + col * config.gridSize,
            y: currentY,
            row: row,
            col: col,
            paragraphType: para.type,
            width: config.gridSize,
            height: config.gridSize
          });
        }
        row++;
        currentY += config.gridSize; // Fixed row height
      }
      // Add paragraph spacing? Grid usually tight.
      if (para !== content.paragraphs[content.paragraphs.length - 1]) {
           currentY += config.gridSize * 0.5; // Half line spacing between paragraphs
      }
    }

    return {
      items,
      totalHeight: currentY + config.paddingBottom,
      totalWidth: config.columns * config.gridSize, // Approx
      lineOffsets,
      getViewportItems: (scrollTop, viewHeight) => 
        getViewportItems(items, scrollTop, viewHeight)
    };
  }
};
