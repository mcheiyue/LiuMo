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
  width: number;
  height: number;
}

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
}

export interface LayoutResult {
  items: RenderItem[];
  totalHeight: number;
  totalWidth: number;
  lineOffsets: number[];
  getViewportItems: (scrollTop: number, viewHeight: number) => RenderItem[];
}

export interface ILayoutStrategy {
  calculate(content: StructuredContent, config: LayoutConfig): LayoutResult;
}
