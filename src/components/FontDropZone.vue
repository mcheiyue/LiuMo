<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

import { useConfigStore } from '../stores/config';

const isDragging = ref(false);
const message = ref("");
const config = useConfigStore();
const emit = defineEmits<{
  (e: 'font-loaded', fontFamily: string): void
}>();

// Payload for Tauri drag-drop event
type DragDropPayload = {
  paths: string[];
  position: { x: number; y: number };
};

let unlisten: (() => void) | null = null;

onMounted(async () => {
  // Listen for file drops via Tauri (gives absolute paths)
  unlisten = await listen<DragDropPayload>('tauri://drag-drop', async (event) => {
    isDragging.value = false;
    const files = event.payload.paths;
    
    if (files.length > 0) {
      handleFiles(files);
    }
  });
});

onUnmounted(() => {
  if (unlisten) unlisten();
});

async function handleFiles(paths: string[]) {
  message.value = "正在分析字体文件...";
  
  for (const path of paths) {
    try {
      // 1. Call Rust backend to validate
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metadata = await invoke<any>('validate_font', { path });
      
      console.log("Font validated:", metadata.family_name);
      
      // 2. Load font into Browser
      const fontName = metadata.family_name;
      
      // Use Base64 data from Rust to bypass CSP/Permission issues with local files
      if (!metadata.base64_data) {
        throw new Error("No font data returned from backend");
      }
      
      const fontUrl = `data:font/${metadata.format};base64,${metadata.base64_data}`;
      
      console.log("Loading font via Base64...");
      const fontFace = new FontFace(fontName, `url("${fontUrl}")`);
      
      // CRITICAL: Must load and add to document
      await fontFace.load();
      document.fonts.add(fontFace);

      // Generate CSS for PDF export
      const css = `
        @font-face {
          font-family: '${fontName}';
          src: url('${fontUrl}');
        }
      `;
      // Update store with both name and data
      config.setFont(fontName, css);
      
      message.value = `成功加载: ${fontName}`;
      
      emit('font-loaded', fontName);
      
      setTimeout(() => message.value = "", 3000);
      return; 
      
    } catch (e) {
      console.error(e);
      message.value = `错误: ${e}`;
      setTimeout(() => message.value = "", 3000);
    }
  }
}

// HTML5 events for UI feedback only
function onDragEnter(e: DragEvent) {
  e.preventDefault();
  isDragging.value = true;
}

function onDragLeave(e: DragEvent) {
  e.preventDefault();
  // Prevent flickering
  if (e.relatedTarget && (e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
    return;
  }
  isDragging.value = false;
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  isDragging.value = false;
  // We rely on 'tauri://drag-drop' for the data
}
</script>

<template>
  <div 
    class="fixed inset-0 z-50 transition-all duration-300 pointer-events-none"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- Overlay Background (only visible when dragging) -->
    <div 
      v-if="isDragging"
      class="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto"
    ></div>

    <!-- Drop Zone Content -->
    <div 
      v-if="isDragging"
      class="absolute inset-4 border-4 border-dashed border-[var(--color-theme)] rounded-2xl flex flex-col items-center justify-center bg-[var(--color-paper)]/90 pointer-events-none"
    >
      <div class="text-6xl mb-4">✍️</div>
      <h2 class="text-3xl font-bold text-[var(--color-theme)] mb-2">释放以安装字体</h2>
      <p class="text-[var(--color-ink)] text-lg">支持 .ttf, .otf</p>
    </div>

    <!-- Status Message Toast -->
    <div v-if="message" class="absolute top-20 left-1/2 -translate-x-1/2 bg-[var(--color-ink)] text-[var(--color-paper)] px-6 py-3 rounded-full shadow-lg pointer-events-auto flex items-center gap-2">
      <span>ℹ️</span>
      <span>{{ message }}</span>
    </div>
  </div>
</template>
