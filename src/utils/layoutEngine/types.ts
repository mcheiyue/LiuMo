export type LayoutStrategy = 'GRID_STANDARD' | 'FLOW_VARYING' | 'CENTER_ALIGNED';

export type ParagraphType = 'main' | 'small' | 'indent' | 'preface' | 'note';

export interface Paragraph {
  type: ParagraphType;
  lines: string[];
}

export interface StructuredContent {
  paragraphs: Paragraph[];
}

export interface RenderItem {
  char: string;
  x: number;
  y: number;
  row: number;
  col: number;
  paragraphType: ParagraphType;
  width?: number;
  height?: number;
  fontSize?: number;
}

// 兼容 PDF 导出所需的别名
export type LayoutItem = RenderItem;

export interface LayoutResult {

  items: RenderItem[];
  totalHeight: number;
  totalWidth: number;
  lineOffsets: number[];
  getViewportItems: (scrollTop: number, viewHeight: number) => RenderItem[];
}

export type GridType = 'mizi' | 'tianzi' | 'huigong' | 'none';

export interface LayoutConfig {
  fontSize: number;
  lineHeight: number;
  charWidth: number;
  gridSize: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  columns: number;
  isVertical: boolean;
  
  // New properties for full reactivity
  layoutDirection: 'vertical' | 'horizontal';
  verticalColumnOrder?: 'rtl' | 'ltr';
  borderMode: 'full' | 'lines-only' | 'none';
  gridType: string; // Using string to support custom grid types if needed, but primarily GridType
  gap: number;
  maxRows?: number;
}

export interface ILayoutStrategy {
  calculate(content: StructuredContent, config: LayoutConfig): LayoutResult;
}
