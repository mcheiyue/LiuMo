<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { Poetry } from '../types/poetry';

const emit = defineEmits<{
  (e: 'select', text: string): void
  (e: 'close'): void
}>();

const poetryList = ref<Poetry[]>([]);
const searchQuery = ref('');
const selectedType = ref<string>('all');
const isLoading = ref(false);

async function fetchPoetry() {
  isLoading.value = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await invoke<any[]>('search_poetry', {
      keyword: searchQuery.value,
      typeFilter: selectedType.value
    });
    
    // Parse content from JSON string
    poetryList.value = results.map(p => ({
      ...p,
      type: p.type_, // Map Rust type_ to type
      content: JSON.parse(p.content)
    }));
  } catch (e) {
    console.error("Failed to fetch poetry:", e);
  } finally {
    isLoading.value = false;
  }
}

// Fetch on mount and when filters change
onMounted(fetchPoetry);
watch([searchQuery, selectedType], fetchPoetry);

function selectPoetry(poetry: Poetry) {
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
          <span>📚</span> 诗词库 (SQLite)
        </h2>
        <button class="btn btn-sm btn-circle btn-ghost" @click="$emit('close')">✕</button>
      </div>
      
      <!-- Filters -->
      <div class="p-4 flex gap-2">
        <input 
          v-model.lazy="searchQuery" 
          type="text" 
          placeholder="搜索标题或作者..." 
          class="input input-bordered input-sm flex-1"
          @keyup.enter="fetchPoetry"
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
      <div class="flex-1 overflow-y-auto p-4 space-y-2 bg-base-100 relative">
        <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-base-100/50 z-10">
          <span class="loading loading-spinner loading-md text-cinnabar"></span>
        </div>

        <div 
          v-for="poetry in poetryList" 
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
        
        <div v-if="!isLoading && poetryList.length === 0" class="text-center py-10 text-base-content/50">
          没有找到相关诗词
        </div>
      </div>
    </div>
  </div>
</template>
