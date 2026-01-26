import { defineStore } from 'pinia';
import { ref, watchEffect } from 'vue';

export const useConfigStore = defineStore('config', () => {
  // Default text
  const text = ref("天地玄黄宇宙洪荒日月盈昃辰宿列张寒来暑往秋收冬藏闰余成岁律吕调阳");
  
  // Appearance
  const currentFont = ref<string>("");
  const layoutDirection = ref<'vertical' | 'horizontal'>('vertical');
  // Order of columns/rows: 
  // Vertical: 'rtl' (default, right-to-left) or 'ltr' (left-to-right)
  const verticalColumnOrder = ref<'rtl' | 'ltr'>('rtl');
  
  const borderMode = ref<'full' | 'lines-only' | 'none'>('full');
  // gridType only active when borderMode === 'full'
  const gridType = ref<'mizi' | 'tianzi' | 'huigong' | 'none'>('mizi');
  // Auto-detect poetry format to snap rows/cols
  const smartSnap = ref(true);
  
  // Manual Grid Overrides
  // Initialize with safe defaults.
  // We use a watcher to ensure structure exists if restored state is partial/broken.
  const fixedGrid = ref({
    enabled: false,
    rows: 10,
    cols: 6
  });

  // Font Face CSS (Base64) - Not persisted to avoid LocalStorage quota limits
  const fontFaceCss = ref<string>("");
  
  // Watcher to auto-repair state if needed
  watchEffect(() => {
    if (!fixedGrid.value) {
      fixedGrid.value = { enabled: false, rows: 10, cols: 6 };
    }
  });

  function setFont(fontName: string, css?: string) {
    currentFont.value = fontName;
    if (css) {
      fontFaceCss.value = css;
    }
  }

  function updateText(newText: string) {
    text.value = newText;
  }

  return {
    text,
    currentFont,
    fontFaceCss,
    layoutDirection,
    verticalColumnOrder,
    borderMode,
    gridType,
    smartSnap,
    fixedGrid,
    setFont,
    updateText
  };
}, {
  persist: {
    // Persist everything EXCEPT fontFaceCss (it's too large)
    paths: [
      'text', 
      'currentFont', 
      'layoutDirection', 
      'verticalColumnOrder', 
      'borderMode', 
      'gridType', 
      'smartSnap', 
      'fixedGrid'
    ]
  } as any
});

