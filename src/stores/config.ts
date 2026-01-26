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
  
  // Watcher to auto-repair state if needed
  watchEffect(() => {
    if (!fixedGrid.value) {
      fixedGrid.value = { enabled: false, rows: 10, cols: 6 };
    }
  });

  function setFont(fontName: string) {
    currentFont.value = fontName;
  }

  function updateText(newText: string) {
    text.value = newText;
  }

  return {
    text,
    currentFont,
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
    // pinia-plugin-persistedstate usually replaces the whole state.
    // If we add new fields, they will be undefined for existing users.
    // We can use the 'afterRestore' hook or similar if using the advanced plugin, 
    // or simply check and patch in the component/store.
    // But a simpler way for a setup store is to manually check defaults on init? 
    // No, init runs, then persist plugin overwrites it.
    
    // Simplest fix: return a merged state? 
    // No, let's fix it by manually checking 'fixedGrid' validity in the return object 
    // or using a specific hydration strategy if the plugin supports it.
    // Assuming standard pinia-plugin-persistedstate:
    // It does NOT support deep merge by default unless configured.
    // But we can just handle the potential undefined in the components (PaperCanvas.vue)
    // AND we can add a simple check here to ensuring it's not undefined in the store itself?
    // Actually, we can't easily intercept the restore in the setup function body easily 
    // because restore happens *after* setup.
    
    // So the robustness MUST be in the components consuming it.
    // OR we can add a watcher to initialize it if missing?
    paths: ['text', 'currentFont', 'layoutDirection', 'borderMode', 'gridType', 'smartSnap', 'fixedGrid'],
  }
});

