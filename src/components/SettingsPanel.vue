<script setup lang="ts">
const props = defineProps<{
  gridType: 'mizi' | 'tianzi' | 'huigong' | 'none';
  showGrid: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:gridType', val: 'mizi' | 'tianzi' | 'huigong' | 'none'): void;
  (e: 'update:showGrid', val: boolean): void;
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
        <!-- Grid Visibility -->
        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-4">
            <span class="label-text text-lg font-bold text-ink">显示格线</span> 
            <input 
              type="checkbox" 
              class="toggle toggle-error" 
              :checked="showGrid"
              @change="$emit('update:showGrid', ($event.target as HTMLInputElement).checked)" 
            />
          </label>
        </div>

        <!-- Grid Type Selection -->
        <div class="space-y-3">
          <h3 class="text-lg font-bold text-ink">格线样式</h3>
          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="option in gridOptions"
              :key="option.value"
              class="btn btn-outline"
              :class="{ 'btn-active bg-cinnabar text-white border-cinnabar hover:bg-red-800 hover:border-red-900': gridType === option.value }"
              @click="$emit('update:gridType', option.value)"
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
