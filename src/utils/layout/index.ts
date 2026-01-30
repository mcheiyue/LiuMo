export * from './types';
export * from './strategies/GridStandard';
export * from './strategies/FlowVarying';
export * from './strategies/CenterAligned';

import { ILayoutStrategy } from './types';
import { GridStandardStrategy } from './strategies/GridStandard';
import { FlowVaryingStrategy } from './strategies/FlowVarying';
import { CenterAlignedStrategy } from './strategies/CenterAligned';

export function getLayoutStrategy(type: string): ILayoutStrategy {
  switch (type) {
    case 'GRID_STANDARD':
      return new GridStandardStrategy();
    case 'FLOW_VARYING':
      return new FlowVaryingStrategy();
    case 'CENTER_ALIGNED':
      return new CenterAlignedStrategy();
    default:
      // Fallback
      return new GridStandardStrategy();
  }
}
