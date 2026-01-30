import type { ILayoutStrategy, LayoutResult, StructuredContent, LayoutConfig, RenderItem } from '../types';
import { getViewportItems } from '../virtualScroll';

export const flowStrategy: ILayoutStrategy = {
  calculate(content: StructuredContent, config: LayoutConfig): LayoutResult {
    const items: RenderItem[] = [];
    const lineOffsets: number[] = [];
    let currentY = config.paddingTop;
    let row = 0;

    for (const para of content.paragraphs) {
      // Determine font size based on paragraph type
      let fontSize = config.fontSize;
      let lineHeight = config.lineHeight;
      let charWidth = config.charWidth;
      
      if (para.type === 'small' || para.type === 'note') {
          fontSize = config.fontSize * 0.6;
          lineHeight = config.lineHeight * 0.7;
          charWidth = config.charWidth * 0.6;
      } else if (para.type === 'preface') {
          fontSize = config.fontSize * 0.8;
          lineHeight = config.lineHeight * 0.8;
          charWidth = config.charWidth * 0.8;
      }

      for (const line of para.lines) {
        lineOffsets.push(currentY);
        
        // Center alignment for Flow Strategy (Song Ci style)
        // Calculate line width
        const lineWidth = line.length * charWidth;
        // Canvas width available
        // Let's assume columns * standardCharWidth defines the "page width"
        const pageWidth = config.columns * config.charWidth;
        const startX = config.paddingLeft + (pageWidth - lineWidth) / 2;
        
        for (let col = 0; col < line.length; col++) {
          items.push({
            char: line[col],
            x: startX + col * charWidth,
            y: currentY,
            row: row,
            col: col,
            paragraphType: para.type,
            width: charWidth,
            height: lineHeight
          });
        }
        row++;
        currentY += lineHeight;
      }
      
      // Paragraph spacing
      currentY += lineHeight * 0.5;
    }

    return {
      items,
      totalHeight: currentY + config.paddingBottom,
      totalWidth: config.columns * config.charWidth,
      lineOffsets,
      getViewportItems: (scrollTop, viewHeight) => 
        getViewportItems(items, scrollTop, viewHeight)
    };
  }
};
