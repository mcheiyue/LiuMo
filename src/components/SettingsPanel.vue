<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useConfigStore } from '../stores/config';

const configStore = useConfigStore();
// Use storeToRefs to maintain reactivity when destructuring
const { 
  layoutDirection, 
  verticalColumnOrder, 
  borderMode, 
  gridType 
} = storeToRefs(configStore);

defineEmits<{
  (e: 'close'): void;
}>();

const gridOptions = [
  { label: '米字格', value: 'mizi' },
  { label: '田字格', value: 'tianzi' },
  { label: '回宫格', value: 'huigong' },
  { label: '无边框', value: 'none' },
] as const;
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity" @click.self="$emit('close')">
    <div class="bg-[var(--color-paper)] w-full max-w-md rounded-xl shadow-2xl overflow-hidden transform transition-all">
      <div class="p-4 border-b border-[var(--color-ink)]/10 flex justify-between items-center bg-[var(--color-theme)]/10">
        <h2 class="text-xl font-bold text-[var(--color-ink)]">⚙️ 设置</h2>
        <button class="btn btn-sm btn-circle btn-ghost" @click="$emit('close')">✕</button>
      </div>
      
        <div class="p-6 space-y-6">
          <!-- Layout Direction -->
          <div class="form-control">
          <label class="label">
             <span class="label-text text-lg font-bold text-[var(--color-ink)]">排版方向</span>
          </label>
          <div class="join w-full grid grid-cols-2">
            <button 
              class="btn btn-outline join-item border-[var(--color-ink)]/20 text-[var(--color-ink)] hover:bg-[var(--color-theme)] hover:text-white hover:border-[var(--color-theme)] transition-all duration-200"
              :class="{ 'btn-active !bg-[var(--color-theme)] !text-white !border-transparent': layoutDirection === 'vertical' }"
              @click="layoutDirection = 'vertical'"
            >
              竖排
            </button>
            <button 
              class="btn btn-outline join-item border-[var(--color-ink)]/20 text-[var(--color-ink)] hover:bg-[var(--color-theme)] hover:text-white hover:border-[var(--color-theme)] transition-all duration-200"
              :class="{ 'btn-active !bg-[var(--color-theme)] !text-white !border-transparent': layoutDirection === 'horizontal' }"
              @click="layoutDirection = 'horizontal'"
            >
              横排
            </button>
          </div>
          
          <!-- Sub-option for Vertical Direction -->
          <div v-if="layoutDirection === 'vertical'" class="mt-4 pl-1 flex items-center gap-3 animate-fade-in-down">
             <label class="label-text text-sm text-[var(--color-ink)]/70">列排列顺序:</label>
             <div class="join join-sm">
               <button 
                 class="btn btn-xs join-item transition-colors"
                 :class="verticalColumnOrder === 'rtl' ? 'btn-active !bg-[var(--color-theme)] !text-white' : 'btn-ghost text-[var(--color-ink)]'"
                 @click="verticalColumnOrder = 'rtl'"
               >
                 从右向左 (传统)
               </button>
               <button 
                 class="btn btn-xs join-item transition-colors"
                 :class="verticalColumnOrder === 'ltr' ? 'btn-active !bg-[var(--color-theme)] !text-white' : 'btn-ghost text-[var(--color-ink)]'"
                 @click="verticalColumnOrder = 'ltr'"
               >
                 从左向右 (现代)
               </button>
             </div>
          </div>
        </div>
        
        <!-- Border Mode -->
        <div class="space-y-3">
          <label class="label">
             <span class="label-text text-lg font-bold text-[var(--color-ink)]">边框模式</span>
          </label>
          <div class="join w-full grid grid-cols-3">
            <button 
              class="btn btn-outline join-item border-[var(--color-ink)]/20 text-[var(--color-ink)] hover:bg-[var(--color-theme)] hover:text-white hover:border-[var(--color-theme)] transition-all duration-200"
              :class="{ 'btn-active !bg-[var(--color-theme)] !text-white !border-transparent': borderMode === 'full' }"
              @click="borderMode = 'full'"
            >
              完整网格
            </button>
            <button 
              class="btn btn-outline join-item border-[var(--color-ink)]/20 text-[var(--color-ink)] hover:bg-[var(--color-theme)] hover:text-white hover:border-[var(--color-theme)] transition-all duration-200"
              :class="{ 'btn-active !bg-[var(--color-theme)] !text-white !border-transparent': borderMode === 'lines-only' }"
              @click="borderMode = 'lines-only'"
            >
              仅分隔线
            </button>
            <button 
              class="btn btn-outline join-item border-[var(--color-ink)]/20 text-[var(--color-ink)] hover:bg-[var(--color-theme)] hover:text-white hover:border-[var(--color-theme)] transition-all duration-200"
              :class="{ 'btn-active !bg-[var(--color-theme)] !text-white !border-transparent': borderMode === 'none' }"
              @click="borderMode = 'none'"
            >
              无边框
            </button>
          </div>
        </div>

        <!-- Grid Type Selection (Only for Full Mode) -->
        <div class="space-y-3" v-if="borderMode === 'full'">
          <h3 class="text-lg font-bold text-[var(--color-ink)]">格线样式</h3>
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="option in gridOptions.filter(o => o.value !== 'none')"
              :key="option.value"
              class="btn btn-outline border-[var(--color-ink)]/20 text-[var(--color-ink)] hover:bg-[var(--color-theme)] hover:text-white hover:border-[var(--color-theme)] transition-all duration-200"
              :class="{ 'btn-active !bg-[var(--color-theme)] !text-white !border-transparent': gridType === option.value }"
              @click="gridType = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

      </div>
      
      <div class="p-4 bg-[var(--color-paper)] border-t border-[var(--color-ink)]/10 flex justify-end">
        <button class="btn btn-primary bg-[var(--color-theme)] border-[var(--color-theme)] hover:bg-[var(--color-theme)]/80 text-white shadow-lg hover:shadow-xl transition-all" @click="$emit('close')">完成</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in-down {
  animation: fadeInDown 0.3s ease-out;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>