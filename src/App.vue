<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { useConfigStore } from './stores/config';
import { usePreferredDark } from '@vueuse/core';
import PaperCanvas from './components/PaperCanvas.vue'; // Direct replacement
import FontDropZone from './components/FontDropZone.vue';
import PoetrySelector from './components/PoetrySelector.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import { exportPdfVector } from './utils/exporter'; // Remove exportToPDF (legacy)

const config = useConfigStore();
const showPoetrySelector = ref(false);
const showSettings = ref(false);
const isExporting = ref(false);
const isSystemDark = usePreferredDark();

// Theme Management
watchEffect(() => {
  const theme = config.theme;
  const targetTheme = theme === 'system' 
    ? (isSystemDark.value ? 'dark' : 'light') 
    : theme;
  
  document.documentElement.setAttribute('data-theme', targetTheme);
  // Also toggle 'dark' class for Tailwind dark mode selector if configured that way
  if (targetTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
});

function onFontLoaded(fontName: string) {
  // Update the reactive font variable to only affect the canvas
  console.log("App received font:", fontName);
  config.setFont(fontName);
}

function onPoetrySelected(newText: string) {
  config.updateText(newText);
  showPoetrySelector.value = false;
}

async function handleExport() {
  try {
    isExporting.value = true;
    const dateStr = new Date().toISOString().split('T')[0];
    // Note: exportPdfVector handles the save dialog internally now
    await exportPdfVector(`LiuMo_Vector_${dateStr}.pdf`, config, config.fontFaceCss);
  } catch (e) {
    console.error(e);
    // Error alert is handled inside exportPdfVector
  } finally {
    isExporting.value = false;
  }
}
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-base-200 overflow-hidden relative text-base-content">
    <FontDropZone @font-loaded="onFontLoaded" />
    <PoetrySelector v-if="showPoetrySelector" @select="onPoetrySelected" @close="showPoetrySelector = false" />
    <SettingsPanel 
      v-if="showSettings" 
      @close="showSettings = false" 
    />
    
    <header class="h-16 px-6 bg-base-100 border-b border-base-300 flex justify-between items-center shadow-sm shrink-0 z-10">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-cinnabar text-white flex items-center justify-center font-serif text-lg rounded-sm">流</div>
        <h1 class="text-xl font-bold text-base-content tracking-widest font-serif">流摹 LiuMo</h1>
      </div>
      
      <div class="flex-1 max-w-xl mx-4">
        <input 
          v-model="config.text" 
          class="input input-bordered input-sm w-full bg-base-200 text-base-content focus:border-cinnabar focus:outline-none" 
          placeholder="请输入要练习的文字..."
        />
      </div>
      
      <div class="flex gap-2 items-center">
         
         <button class="btn btn-sm btn-ghost text-base-content" @click="showPoetrySelector = true">📚 诗词库</button>
         <button class="btn btn-sm btn-ghost text-base-content" @click="showSettings = true">⚙️ 设置</button>
         <button 
           class="btn btn-sm bg-cinnabar text-white hover:bg-red-800 border-none"
           :class="{ 'opacity-50 cursor-not-allowed': isExporting }"
           @click="handleExport"
         >
           {{ isExporting ? '导出中...' : '导出 PDF' }}
         </button>
      </div>
    </header>
    
    <main class="flex-1 overflow-auto relative bg-base-300/50">
      <PaperCanvas
        :text="config.text" 
        :font-family="config.currentFont"
        :grid-type="config.gridType"
        :border-mode="config.borderMode"
        :layout-direction="config.layoutDirection"
        :vertical-column-order="config.verticalColumnOrder"
        :smart-snap="config.smartSnap"
        :fixed-grid="config.fixedGrid"
        :font-face-css="config.fontFaceCss"
      />
    </main>
  </div>
</template>
