import type { RenderItem } from './types';

export function getViewportItems(
  items: RenderItem[],
  scrollTop: number,
  viewHeight: number,
  preRender: number = 100
): RenderItem[] {
  const startY = scrollTop - preRender;
  const endY = scrollTop + viewHeight + preRender;

  return items.filter((item) => item.y >= startY && item.y <= endY);
}
