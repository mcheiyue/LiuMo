<script setup lang="ts">
import { useConfigStore } from '../stores/config';

const config = useConfigStore();

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
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="$emit('close')">
    <div class="bg-base-100 w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
      <div class="p-4 border-b border-base-200 flex justify-between items-center bg-base-200/50">
        <h2 class="text-xl font-bold">⚙️ 设置</h2>
        <button class="btn btn-sm btn-circle btn-ghost" @click="$emit('close')">✕</button>
      </div>
      
      <div class="p-6 space-y-6">
        <!-- Appearance Theme -->
        <div class="form-control">
          <label class="label">
             <span class="label-text text-lg font-bold text-base-content">外观模式</span>
          </label>
          <div class="btn-group w-full grid grid-cols-3">
            <button 
              class="btn btn-outline border-base-content/20"
              :class="{ 'btn-active !bg-cinnabar/80 !text-white !border-transparent hover:!bg-cinnabar': config.theme === 'system' }"
              @click="config.theme = 'system'"
            >
              跟随系统
            </button>
            <button 
              class="btn btn-outline border-base-content/20"
              :class="{ 'btn-active !bg-cinnabar/80 !text-white !border-transparent hover:!bg-cinnabar': config.theme === 'light' }"
              @click="config.theme = 'light'"
            >
              浅色
            </button>
            <button 
              class="btn btn-outline border-base-content/20"
              :class="{ 'btn-active !bg-cinnabar/80 !text-white !border-transparent hover:!bg-cinnabar': config.theme === 'dark' }"
              @click="config.theme = 'dark'"
            >
              深色
            </button>
          </div>
        </div>

        <!-- Layout Direction -->
        <div class="form-control">
          <label class="label">
             <span class="label-text text-lg font-bold text-base-content">排版方向</span>
          </label>
          <div class="btn-group w-full grid grid-cols-2">
            <button 
              class="btn btn-outline border-base-content/20"
              :class="{ 'btn-active !bg-cinnabar/80 !text-white !border-transparent hover:!bg-cinnabar': config.layoutDirection === 'vertical' }"
              @click="config.layoutDirection = 'vertical'"
            >
              竖排
            </button>
            <button 
              class="btn btn-outline border-base-content/20"
              :class="{ 'btn-active !bg-cinnabar/80 !text-white !border-transparent hover:!bg-cinnabar': config.layoutDirection === 'horizontal' }"
              @click="config.layoutDirection = 'horizontal'"
            >
              横排
            </button>
          </div>
          
          <!-- Sub-option for Vertical Direction -->
          <div v-if="config.layoutDirection === 'vertical'" class="mt-2 pl-1">
             <label class="label-text text-sm text-base-content/70 mr-2">列排列顺序:</label>
             <div class="btn-group btn-group-sm inline-flex align-middle">
               <button 
                 class="btn btn-xs"
                 :class="config.verticalColumnOrder === 'rtl' ? 'btn-active btn-neutral' : 'btn-ghost'"
                 @click="config.verticalColumnOrder = 'rtl'"
               >
                 从右向左 (传统)
               </button>
               <button 
                 class="btn btn-xs"
                 :class="config.verticalColumnOrder === 'ltr' ? 'btn-active btn-neutral' : 'btn-ghost'"
                 @click="config.verticalColumnOrder = 'ltr'"
               >
                 从左向右 (现代)
               </button>
             </div>
          </div>
        </div>
        
        <!-- Smart Snap Toggle -->
        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-4">
             <span class="label-text text-lg font-bold text-base-content">智能格线吸附</span>
             <input type="checkbox" class="toggle toggle-error" v-model="config.smartSnap" />
          </label>
          <p class="text-xs text-base-content/70 mt-1 pl-1">
            根据诗词格律自动调整行列数（例如七言诗自动设为8行）
          </p>
        </div>
        
        <!-- Manual Grid Override -->
        <div class="form-control bg-base-200 p-3 rounded-lg border border-base-300">
           <label class="label cursor-pointer justify-start gap-4 pb-0">
             <span class="label-text font-bold text-base-content">固定行列 (手动控制)</span>
             <input type="checkbox" class="toggle toggle-sm toggle-error" v-model="config.fixedGrid.enabled" />
           </label>
           
           <div v-if="config.fixedGrid.enabled" class="grid grid-cols-2 gap-4 mt-3">
             <div class="form-control">
               <label class="label text-xs text-base-content/70 py-1">
                 {{ config.layoutDirection === 'vertical' ? '每列字数 (行高)' : '每行字数 (行宽)' }}
               </label>
               <input 
                 v-if="config.layoutDirection === 'vertical'"
                 type="number" 
                 min="1" 
                 max="50" 
                 class="input input-bordered input-sm w-full bg-base-100 text-base-content" 
                 v-model.number="config.fixedGrid.rows" 
               />
               <input 
                 v-else
                 type="number" 
                 min="1" 
                 max="50" 
                 class="input input-bordered input-sm w-full bg-base-100 text-base-content" 
                 v-model.number="config.fixedGrid.cols" 
               />
             </div>
             
             <!-- Informational Placeholder for Auto Axis -->
             <div class="form-control">
               <label class="label text-xs text-base-content/70 py-1">
                  {{ config.layoutDirection === 'vertical' ? '列数 (自动)' : '行数 (自动)' }}
               </label>
               <button class="btn btn-sm btn-disabled btn-ghost border-base-300">
                 自动计算
               </button>
             </div>
           </div>
        </div>

        <!-- Border Mode -->
        <div class="space-y-3">
          <label class="label">
             <span class="label-text text-lg font-bold text-base-content">边框模式</span>
          </label>
          <div class="btn-group w-full grid grid-cols-3">
            <button 
              class="btn btn-outline border-base-content/20"
              :class="{ 'btn-active !bg-cinnabar/80 !text-white !border-transparent hover:!bg-cinnabar': config.borderMode === 'full' }"
              @click="config.borderMode = 'full'"
            >
              完整网格
            </button>
            <button 
              class="btn btn-outline border-base-content/20"
              :class="{ 'btn-active !bg-cinnabar/80 !text-white !border-transparent hover:!bg-cinnabar': config.borderMode === 'lines-only' }"
              @click="config.borderMode = 'lines-only'"
            >
              仅分隔线
            </button>
            <button 
              class="btn btn-outline border-base-content/20"
              :class="{ 'btn-active !bg-cinnabar/80 !text-white !border-transparent hover:!bg-cinnabar': config.borderMode === 'none' }"
              @click="config.borderMode = 'none'"
            >
              无边框
            </button>
          </div>
        </div>

        <!-- Grid Type Selection (Only for Full Mode) -->
        <div class="space-y-3" v-if="config.borderMode === 'full'">
          <h3 class="text-lg font-bold text-base-content">格线样式</h3>
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="option in gridOptions.filter(o => o.value !== 'none')"
              :key="option.value"
              class="btn btn-outline border-base-content/20"
              :class="{ 'btn-active !bg-cinnabar/80 !text-white !border-transparent hover:!bg-cinnabar': config.gridType === option.value }"
              @click="config.gridType = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

      </div>
      
      <div class="p-4 bg-base-100 border-t border-base-200 flex justify-end">
        <button class="btn btn-primary bg-cinnabar border-none text-white" @click="$emit('close')">完成</button>
      </div>
    </div>
  </div>
</template>
