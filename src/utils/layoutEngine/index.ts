import { ref } from 'vue';
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
  fontSize: 32,
  lineHeight: 48,
  charWidth: 32,
  gridSize: 40,
  paddingTop: 60,
  paddingBottom: 60,
  paddingLeft: 40,
  paddingRight: 40,
  columns: 14,
  isVertical: false
};

export function useLayoutEngine() {
  const config = ref<LayoutConfig>({ ...defaultConfig });

  function calculate(
    content: StructuredContent, 
    strategyName: LayoutStrategy = 'CENTER_ALIGNED'
  ): LayoutResult {
    const strategy = strategies[strategyName] || strategies.CENTER_ALIGNED;
    return strategy.calculate(content, config.value);
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
