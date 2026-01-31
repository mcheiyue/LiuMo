import { defineStore } from 'pinia';
import { ref, watchEffect } from 'vue';

export const useConfigStore = defineStore('config', () => {
  // Default text
  const text = ref("天地玄黄宇宙洪荒日月盈昃辰宿列张寒来暑往秋收冬藏闰余成岁律吕调阳");
  
  // Appearance
  const theme = ref<'system' | 'light' | 'dark'>('system');
  const currentFont = ref<string>("FlyFlowerSong");
  const layoutDirection = ref<'vertical' | 'horizontal'>('vertical');
  // Order of columns/rows: 
  // Vertical: 'rtl' (default, right-to-left) or 'ltr' (left-to-right)
  const verticalColumnOrder = ref<'rtl' | 'ltr'>('rtl');
  
  const borderMode = ref<'full' | 'lines-only' | 'none'>('full');
  // gridType only active when borderMode === 'full'
  const gridType = ref<'mizi' | 'tianzi' | 'huigong' | 'none'>('mizi');

  // Font Face CSS (Base64) - Not persisted to avoid LocalStorage quota limits
  const fontFaceCss = ref<string>("");
  
  // Watcher to auto-repair state if needed
  watchEffect(() => {
    // No auto-repair needed currently
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
    theme,
    currentFont,
    fontFaceCss,
    layoutDirection,
    verticalColumnOrder,
    borderMode,
    gridType,
    setFont,
    updateText
  };
}, {
  persist: {
    // Persist everything EXCEPT fontFaceCss (it's too large)
    paths: [
      'text', 
      'theme',
      'currentFont', 
      'layoutDirection', 
      'verticalColumnOrder', 
      'borderMode', 
      'gridType'
    ]
  } as any
});

