<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Poetry, PoetryCollection } from '../types/poetry';
import demoData from '../assets/demo-poetry.json';

const emit = defineEmits<{
  (e: 'select', text: string): void
  (e: 'close'): void
}>();

const collection = demoData as PoetryCollection;
const searchQuery = ref('');
const selectedType = ref<string>('all');

const filteredPoetry = computed(() => {
  return collection.data.filter(p => {
    const matchesSearch = p.title.includes(searchQuery.value) || p.author.includes(searchQuery.value);
    const matchesType = selectedType.value === 'all' || p.type === selectedType.value;
    return matchesSearch && matchesType;
  });
});

function selectPoetry(poetry: Poetry) {
  // Combine content into a single string, stripping punctuation if needed, 
  // but for now let's keep it simple and just join them.
  // For calligraphy, we often want just the characters, but punctuation is fine too.
  const text = poetry.content.join(''); 
  emit('select', text);
  emit('close');
}
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="$emit('close')">
    <div class="bg-base-100 w-full max-w-2xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="p-4 border-b border-base-200 flex justify-between items-center bg-base-200/50">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <span>📚</span> 诗词库
        </h2>
        <button class="btn btn-sm btn-circle btn-ghost" @click="$emit('close')">✕</button>
      </div>
      
      <!-- Filters -->
      <div class="p-4 flex gap-2">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="搜索标题或作者..." 
          class="input input-bordered input-sm flex-1"
        />
        <select v-model="selectedType" class="select select-bordered select-sm">
          <option value="all">全部</option>
          <option value="shi">古诗</option>
          <option value="ci">宋词</option>
          <option value="modern">现代诗</option>
          <option value="prose">古文</option>
        </select>
      </div>
      
      <!-- List -->
      <div class="flex-1 overflow-y-auto p-4 space-y-2 bg-base-100">
        <div 
          v-for="poetry in filteredPoetry" 
          :key="poetry.id"
          class="card card-compact bg-base-100 border border-base-200 hover:border-cinnabar/50 hover:bg-stone-50 transition-colors cursor-pointer group"
          @click="selectPoetry(poetry)"
        >
          <div class="card-body flex-row items-center justify-between">
            <div>
              <h3 class="font-bold text-lg group-hover:text-cinnabar transition-colors">{{ poetry.title }}</h3>
              <p class="text-sm text-base-content/70">
                <span class="badge badge-sm badge-ghost mr-2">{{ poetry.dynasty }}</span>
                {{ poetry.author }}
              </p>
            </div>
            <div class="text-xs text-base-content/40 font-mono">
              {{ poetry.content[0].substring(0, 10) }}...
            </div>
          </div>
        </div>
        
        <div v-if="filteredPoetry.length === 0" class="text-center py-10 text-base-content/50">
          没有找到相关诗词
        </div>
      </div>
    </div>
  </div>
</template>
