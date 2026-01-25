import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useConfigStore = defineStore('config', () => {
  // Default text
  const text = ref("天地玄黄宇宙洪荒日月盈昃辰宿列张寒来暑往秋收冬藏闰余成岁律吕调阳");
  
  // Appearance
  const currentFont = ref<string>("");
  const gridType = ref<'mizi' | 'tianzi' | 'huigong' | 'none'>('mizi');
  const showGrid = ref(true);

  // Actions can be added if complex logic is needed, 
  // but for simple state, direct modification is fine in Setup Stores.

  function setFont(fontName: string) {
    currentFont.value = fontName;
  }

  function updateText(newText: string) {
    text.value = newText;
  }

  return {
    text,
    currentFont,
    gridType,
    showGrid,
    setFont,
    updateText
  };
}, {
  persist: true // Enable localStorage persistence
});
