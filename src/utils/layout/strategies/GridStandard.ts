import { 
  ContentStructure, 
  LayoutConfig, 
  LayoutResult, 
  LayoutItem, 
  ILayoutStrategy 
} from '../types';

export class GridStandardStrategy implements ILayoutStrategy {
  calculate(content: ContentStructure, config: LayoutConfig): LayoutResult {
    const items: LayoutItem[] = [];
    const { 
      fontSize, 
      // lineHeight,  // Unused
      isVertical, 
      columnGap, 
      rowGap,
      padding,
      width: containerWidth,
      height: containerHeight 
    } = config;

    // Flatten all lines from all paragraphs (Grid Standard ignores structure mostly)
    let allText = "";
    content.paragraphs.forEach((p: any) => {
        p.lines.forEach((line: string) => {
            allText += line; 
        });
    });

    const cellSize = fontSize;
    const effectiveColGap = columnGap || 0;
    const effectiveRowGap = rowGap || 0;
    
    let rows = 0;
    let cols = 0;
    
    const availableWidth = Math.max(0, containerWidth - padding.left - padding.right);
    const availableHeight = Math.max(0, containerHeight - padding.top - padding.bottom);

    if (isVertical) {
        rows = Math.floor((availableHeight + effectiveRowGap) / (cellSize + effectiveRowGap));
        rows = Math.max(1, rows);
        
        const len = Math.max(allText.length, 1);
        cols = Math.ceil(len / rows);
        const minCols = Math.floor((availableWidth + effectiveColGap) / (cellSize + effectiveColGap));
        cols = Math.max(cols, minCols);
        
    } else {
        cols = Math.floor((availableWidth + effectiveColGap) / (cellSize + effectiveColGap));
        cols = Math.max(1, cols);
        
        const len = Math.max(allText.length, 1);
        rows = Math.ceil(len / cols);
        const minRows = Math.floor((availableHeight + effectiveRowGap) / (cellSize + effectiveRowGap));
        rows = Math.max(rows, minRows);
    }
    
    for (let i = 0; i < allText.length; i++) {
        const char = allText[i];
        let row = 0;
        let col = 0;
        
        if (isVertical) {
            const colIndex = Math.floor(i / rows);
            const rowIndex = i % rows;
            col = (cols - 1) - colIndex; 
            row = rowIndex;
        } else {
            row = Math.floor(i / cols);
            col = i % cols;
        }
        
        const x = padding.left + col * (cellSize + effectiveColGap);
        const y = padding.top + row * (cellSize + effectiveRowGap);
        
        items.push({
            char,
            x,
            y,
            width: cellSize,
            height: cellSize,
            row,
            col
        });
    }

    return {
        items,
        totalWidth: padding.left + padding.right + cols * (cellSize + effectiveColGap) - effectiveColGap,
        totalHeight: padding.top + padding.bottom + rows * (cellSize + effectiveRowGap) - effectiveRowGap
    };
  }
}
