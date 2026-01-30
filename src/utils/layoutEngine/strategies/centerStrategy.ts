import type { ILayoutStrategy, LayoutResult, StructuredContent, LayoutConfig, RenderItem } from '../types';
import { getViewportItems } from '../virtualScroll';

export const centerStrategy: ILayoutStrategy = {
  calculate(content: StructuredContent, config: LayoutConfig): LayoutResult {
    const items: RenderItem[] = [];
    const lineOffsets: number[] = [];
    let currentY = config.paddingTop;
    let row = 0;

    for (const para of content.paragraphs) {
      // Standard font for center strategy usually
      let fontSize = config.fontSize;
      let lineHeight = config.lineHeight;
      let charWidth = config.charWidth;

      if (para.type === 'small' || para.type === 'note') {
          fontSize = config.fontSize * 0.7;
          lineHeight = config.lineHeight * 0.8;
          charWidth = config.charWidth * 0.7;
      }

      // Auto-wrap logic for long lines in Center Strategy?
      // Or assume lines are already broken by source/AI?
      // V8.0 assumes lines are pre-broken or we respect newlines.
      // If line is too long, we might need to wrap.
      // But for now, let's respect source lines and center them.
      
      for (const line of para.lines) {
        lineOffsets.push(currentY);
        
        const lineWidth = line.length * charWidth;
        const pageWidth = config.columns * config.charWidth;
        const startX = config.paddingLeft + Math.max(0, (pageWidth - lineWidth) / 2);
        
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
      currentY += lineHeight * 0.8; // More spacing for prose
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
