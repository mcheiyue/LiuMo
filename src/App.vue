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

// Theme Management - with View Transitions
function toggleTheme(event: MouseEvent) {
  const isDark = config.theme === 'dark' || (config.theme === 'system' && isSystemDark.value);
  const nextTheme = isDark ? 'light' : 'dark';

  // @ts-ignore - View Transitions API
  if (!document.startViewTransition) {
    config.theme = nextTheme;
    return;
  }

  // Get click position for ripple origin
  const x = event.clientX;
  const y = event.clientY;

  // @ts-ignore
  const transition = document.startViewTransition(() => {
    config.theme = nextTheme;
  });

  transition.ready.then(() => {
    // Calculate radius to cover the furthest corner
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`
        ]
      },
      {
        duration: 500,
        easing: 'ease-out',
        pseudoElement: '::view-transition-new(root)'
      }
    );
  });
}

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
  <div class="h-screen w-screen flex flex-col overflow-hidden relative" style="background-color: var(--color-bg-base); color: var(--color-ink);">
    <FontDropZone @font-loaded="onFontLoaded" />
    <PoetrySelector v-if="showPoetrySelector" @select="onPoetrySelected" @close="showPoetrySelector = false" />
    <SettingsPanel 
      v-if="showSettings" 
      @close="showSettings = false" 
    />
    
    <header class="h-16 px-6 border-b flex justify-between items-center shadow-sm shrink-0 z-10" style="background-color: var(--color-bg-base); border-color: var(--color-grid);">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 text-white flex items-center justify-center font-serif text-lg rounded-sm" style="background-color: var(--color-cinnabar);">流</div>
        <h1 class="text-xl font-bold tracking-widest font-serif" style="color: var(--color-ink);">流摹 LiuMo</h1>
      </div>
      
      <div class="flex-1 max-w-xl mx-4">
        <input 
          v-model="config.text" 
          class="input input-bordered input-sm w-full focus:outline-none" 
          style="background-color: rgba(255,255,255,0.3); color: var(--color-ink); border-color: var(--color-grid);"
          placeholder="请输入要练习的文字..."
        />
      </div>
      
      <div class="flex gap-2 items-center">
         
         <button class="btn btn-sm btn-ghost" style="color: var(--color-ink);" @click="showPoetrySelector = true">📚 诗词库</button>
         
         <!-- Theme Toggle Button -->
         <button 
           class="btn btn-sm btn-ghost btn-circle text-xl" 
           style="color: var(--color-ink);" 
           @click="toggleTheme"
           title="切换日/夜模式"
         >
           <span v-if="config.theme === 'dark' || (config.theme === 'system' && isSystemDark)">🌙</span>
           <span v-else>☀️</span>
         </button>

         <button class="btn btn-sm btn-ghost" style="color: var(--color-ink);" @click="showSettings = true">⚙️ 设置</button>
         <button 
           class="btn btn-sm text-white hover:opacity-90 border-none"
           style="background-color: var(--color-theme);"
           :class="{ 'opacity-50 cursor-not-allowed': isExporting }"
           @click="handleExport"
         >
           {{ isExporting ? '导出中...' : '导出 PDF' }}
         </button>
      </div>
    </header>
    
    <main class="flex-1 overflow-auto relative bg-transparent">
      <PaperCanvas
        :text="config.text" 
        :font-family="config.currentFont"
        :grid-type="config.gridType"
        :border-mode="config.borderMode"
        :layout-direction="config.layoutDirection"
        :vertical-column-order="config.verticalColumnOrder"
        :font-face-css="config.fontFaceCss"
      />
    </main>
  </div>
</template>
