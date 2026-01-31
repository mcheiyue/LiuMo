import { ref } from 'vue';
export type { LayoutStrategy, LayoutConfig, LayoutResult, RenderItem, StructuredContent, ParagraphType } from './types';
import type { ILayoutStrategy, LayoutStrategy, StructuredContent, LayoutConfig, LayoutResult } from './types';
import { gridStrategy } from './strategies/gridStrategy';
import { flowStrategy } from './strategies/flowStrategy';
import { centerStrategy } from './strategies/centerStrategy';

const strategies: Record<LayoutStrategy, ILayoutStrategy> = {
  GRID_STANDARD: gridStrategy,
  FLOW_VARYING: flowStrategy,
  CENTER_ALIGNED: centerStrategy,
};

// Default config
const defaultConfig: LayoutConfig = {
  fontSize: 64,
  lineHeight: 48,
  charWidth: 96,
  gridSize: 96,
  paddingTop: 32,
  paddingBottom: 32,
  paddingLeft: 32,
  paddingRight: 32,
  columns: 10,
  isVertical: false,
  
  // New defaults
  layoutDirection: 'horizontal',
  verticalColumnOrder: 'rtl',
  borderMode: 'full',
  gridType: 'mizi',
  gap: 3,
};

// Helper to detect strategy based on content
function detectStrategy(content: StructuredContent): LayoutStrategy {
  // Simple heuristic: if all lines have same length, it's likely a standard poem (GRID)
  // Otherwise use FLOW or CENTER
  if (content.paragraphs.length === 0) return 'GRID_STANDARD';
  
  const firstPara = content.paragraphs[0];
  if (firstPara.lines.length === 0) return 'GRID_STANDARD';
  
  const firstLineLen = firstPara.lines[0].length;
  const allSameLength = content.paragraphs.every(p => 
    p.lines.every(l => l.length === firstLineLen)
  );
  
  if (allSameLength && firstLineLen <= 10) return 'GRID_STANDARD';
  if (firstPara.type === 'main') return 'FLOW_VARYING';
  return 'CENTER_ALIGNED';
}

export function getLayoutStrategy(name: LayoutStrategy): ILayoutStrategy {
  return strategies[name] || strategies.CENTER_ALIGNED;
}

export function useLayoutEngine() {
  const config = ref<LayoutConfig>({ ...defaultConfig });

  function calculate(
    content: StructuredContent, 
    cfg: LayoutConfig
  ): LayoutResult {
    const strategyName = detectStrategy(content);
    const strategy = strategies[strategyName] || strategies.CENTER_ALIGNED;
    return strategy.calculate(content, cfg);
  }
  
  function updateConfig(newConfig: Partial<LayoutConfig>) {
      config.value = { ...config.value, ...newConfig };
  }

  return {
    config,
    calculate,
    updateConfig
  };
}
