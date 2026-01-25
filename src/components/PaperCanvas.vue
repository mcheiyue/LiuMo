<script setup lang="ts">
import CharacterCell from './CharacterCell.vue';
import { ref } from 'vue';

defineProps<{
  text: string;
  fontFamily?: string;
  gridType?: 'mizi' | 'tianzi' | 'huigong' | 'none';
  showGrid?: boolean;
}>();

const contentRef = ref<HTMLElement | null>(null);

defineExpose({
  contentRef
});
</script>

<template>
  <div class="p-8 bg-stone-200 min-h-full flex justify-center overflow-auto">
    <!-- Vertical Layout Container -->
    <div 
      ref="contentRef"
      class="writing-vertical-rl h-[80vh] flex flex-wrap content-start shadow-2xl bg-paper p-0 gap-0"
      :class="{ 'border-r border-b border-cinnabar/50': showGrid && gridType !== 'none' }"
      :style="{ fontFamily: fontFamily ? `'${fontFamily}', serif` : 'inherit' }"
    >
      <CharacterCell 
        v-for="(char, index) in text" 
        :key="index" 
        :char="char"
        :grid-type="gridType"
        :show-grid="showGrid" 
      />
    </div>
  </div>
</template>
