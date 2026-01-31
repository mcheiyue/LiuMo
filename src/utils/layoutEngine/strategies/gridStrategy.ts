import type { ILayoutStrategy, LayoutResult, StructuredContent, LayoutConfig, RenderItem } from '../types';
import { getViewportItems } from '../virtualScroll';

export const gridStrategy: ILayoutStrategy = {
  calculate(content: StructuredContent, config: LayoutConfig): LayoutResult {
    const { isVertical, gridSize, gap = 0, paddingLeft, paddingTop, paddingRight = 0, paddingBottom = 0, maxRows, borderMode } = config;

    // Fixed gap logic: Always preserve gap space regardless of border mode
    const gapX = gap;
    const gapY = gap;

    const stepX = gridSize + gapX;
    const stepY = gridSize + gapY;
    
    const items: RenderItem[] = [];
    const lineOffsets: number[] = [];

    let maxContentX = 0;
    let maxContentY = 0;

    if (isVertical) {
      // 竖排逻辑
      let row = 0;
      let col = 0;
      
      // 竖排时的行数限制（即一列有多少个字）
      // Smart Grid: 尝试从第一段检测诗句长度，实现“一句一列”的完美网格
      let limitRow = maxRows || 20;
      
      const firstPara = content.paragraphs[0];
      if (firstPara && firstPara.lines.length > 0) {
         const firstLen = firstPara.lines[0].length;
         // 只有当行长一致且长度合理（<50）时才应用自动网格
         // 避免误判长文
         if (firstLen < 50 && firstPara.lines.every(l => l.length === firstLen)) {
             limitRow = firstLen;
         }
      }

      for (const para of content.paragraphs) {
        // 竖排时忽略原有的行结构，将段落内容重新流式排布
        const text = para.lines.join('');
        
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          
          // 竖排：x 轴方向是列（col），y 轴方向是字（row）
          const x = paddingLeft + col * stepX;
          const y = paddingTop + row * stepY;
          
          items.push({
            char,
            x,
            y,
            row,
            col,
            paragraphType: para.type,
            width: gridSize,
            height: gridSize,
            fontSize: config.fontSize
          });
          
          maxContentX = Math.max(maxContentX, x + gridSize);
          maxContentY = Math.max(maxContentY, y + gridSize);

          // 换行逻辑：字向下排，满行（limitRow）后换列
          row++;
          if (row >= limitRow) {
            row = 0;
            col++;
          }
        }
        
        // 段落结束后换列，保持段落独立性
        if (row > 0) {
          row = 0;
          col++;
        }
      }

      // RTL Post-processing
      if (config.verticalColumnOrder === 'rtl') {
        const contentWidth = maxContentX - paddingLeft;
        
        for (const item of items) {
            const relX = item.x - paddingLeft;
            item.x = paddingLeft + (contentWidth - relX - gridSize);
        }
      }

      const totalWidth = maxContentX + paddingRight;
      const totalHeight = maxContentY + paddingBottom;

      return {
        items,
        totalHeight,
        totalWidth, 
        lineOffsets: [], 
        getViewportItems: (scrollPos, viewSize) => 
          getViewportItems(items, scrollPos, viewSize)
      };

    } else {
      // 横排逻辑
      let currentY = paddingTop;
      let row = 0;

      for (const para of content.paragraphs) {
        for (const line of para.lines) {
          lineOffsets.push(currentY);
          
          for (let col = 0; col < line.length; col++) {
            const x = paddingLeft + col * stepX;
            const y = currentY; 

            items.push({
              char: line[col],
              x,
              y,
              row: row,
              col: col,
              paragraphType: para.type,
              width: gridSize,
              height: gridSize,
              fontSize: config.fontSize
            });

            maxContentX = Math.max(maxContentX, x + gridSize);
            maxContentY = Math.max(maxContentY, y + gridSize);
          }
          row++;
          currentY += stepY; 
        }
        // 段落间距
        if (para !== content.paragraphs[content.paragraphs.length - 1]) {
             // Only add paragraph spacing in 'none' mode to maintain strict grid alignment in other modes
             if (borderMode === 'none') {
               currentY += stepY * 0.5;
             }
        }
      }

      return {
        items,
        totalHeight: maxContentY + paddingBottom,
        totalWidth: maxContentX + paddingRight,
        lineOffsets,
        getViewportItems: (scrollTop, viewHeight) => 
          getViewportItems(items, scrollTop, viewHeight)
      };
    }
  }
};
