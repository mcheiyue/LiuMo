import type { RenderItem } from './types';

export function getViewportItems(
  items: RenderItem[],
  scrollTop: number,
  viewHeight: number,
  preRender: number = 100
): RenderItem[] {
  const startY = scrollTop - preRender;
  const endY = scrollTop + viewHeight + preRender;
  
  // Optimization: If items are sorted by Y (which they usually are), we can use binary search
  // But for now, filter is safe and simple enough for < 1000 items
  // For huge lists (e.g. 5000 chars), binary search is better.
  
  // Let's implement binary search start index for performance
  let startIndex = 0;
  if (items.length > 0) {
      let left = 0;
      let right = items.length - 1;
      while (left <= right) {
          const mid = Math.floor((left + right) / 2);
          if (items[mid].y < startY) {
              startIndex = mid;
              left = mid + 1;
          } else {
              right = mid - 1;
          }
      }
      // Backtrack a bit to be safe? No, binary search finds the insertion point.
  }

  const visibleItems: RenderItem[] = [];
  for (let i = startIndex; i < items.length; i++) {
      const item = items[i];
      if (item.y > endY) {
          // Since sorted by Y, we can stop early
          // But wait, items in the same line have same Y but different X.
          // And if grid layout, it's strictly sorted by Y then X.
          // So this optimization is valid.
          break; 
      }
      if (item.y >= startY) {
          visibleItems.push(item);
      }
  }
  
  return visibleItems;
}
