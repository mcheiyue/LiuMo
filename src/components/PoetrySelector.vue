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

// Pagination State
const offset = ref(0);
const hasMore = ref(true);
const limit = 50;

async function fetchPoetry(reset = true) {
  if (reset) {
    offset.value = 0;
    poetryList.value = [];
    hasMore.value = true;
  }
  
  if (!hasMore.value && !reset) return;

  isLoading.value = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await invoke<any[]>('search_poetry', {
      keyword: searchQuery.value,
      typeFilter: selectedType.value,
      offset: offset.value,
      limit: limit
    });
    
    if (results.length < limit) {
      hasMore.value = false;
    }

    // Parse content from JSON string
    const newItems = results.map(p => ({
      ...p,
      type: p.type_, // Map Rust type_ to type
      content: JSON.parse(p.content)
    }));

    if (reset) {
      poetryList.value = newItems;
    } else {
      poetryList.value.push(...newItems);
    }
    
    offset.value += limit;

  } catch (e) {
    console.error("Failed to fetch poetry:", e);
  } finally {
    isLoading.value = false;
  }
}

// Fetch on mount and when filters change
onMounted(() => fetchPoetry(true));

watch([searchQuery, selectedType], () => fetchPoetry(true));

// Infinite Scroll Handler
function onScroll(e: Event) {
  const target = e.target as HTMLElement;
  if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
    if (!isLoading.value && hasMore.value) {
      fetchPoetry(false);
    }
  }
}

function selectPoetry(poetry: Poetry) {
  const text = poetry.content.join(''); 
  emit('select', text);
  emit('close');
}
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="$emit('close')">
    <div class="bg-[var(--color-paper)] w-full max-w-2xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden text-[var(--color-ink)]">
      <!-- Header -->
      <div class="p-4 border-b border-[var(--color-ink)]/10 flex justify-between items-center bg-[var(--color-theme)]/10">
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
          class="input input-bordered input-sm flex-1 bg-[var(--color-paper)] text-[var(--color-ink)] border-[var(--color-ink)]/20 focus:border-[var(--color-theme)]"
          @keyup.enter="fetchPoetry(true)"
        />
        <select v-model="selectedType" class="select select-bordered select-sm bg-[var(--color-paper)] text-[var(--color-ink)] border-[var(--color-ink)]/20 focus:border-[var(--color-theme)]">
          <option value="all">全部</option>
          <option value="shi">古诗</option>
          <option value="ci">宋词</option>
          <option value="qu">元曲</option>
          <option value="modern">现代诗</option>
          <option value="prose">古文经典</option>
        </select>
      </div>
      
      <!-- List -->
      <div 
        class="flex-1 overflow-y-auto p-4 space-y-2 bg-[var(--color-paper)] relative"
        @scroll="onScroll"
      >
        <div v-if="isLoading && poetryList.length === 0" class="absolute inset-0 flex items-center justify-center bg-[var(--color-paper)]/50 z-10">
          <span class="loading loading-spinner loading-md text-[var(--color-theme)]"></span>
        </div>

        <div 
          v-for="poetry in poetryList" 
          :key="poetry.id"
          class="card card-compact bg-[var(--color-paper)] border border-[var(--color-ink)]/10 hover:border-[var(--color-theme)] hover:bg-[var(--color-theme)]/5 transition-colors cursor-pointer group"
          @click="selectPoetry(poetry)"
        >
          <div class="card-body flex-row items-center justify-between">
            <div>
              <h3 class="font-bold text-lg group-hover:text-[var(--color-theme)] transition-colors text-[var(--color-ink)]">{{ poetry.title }}</h3>
              <p class="text-sm text-[var(--color-ink)]/70">
                <span class="badge badge-sm badge-ghost mr-2 text-[var(--color-ink)]/70">{{ poetry.dynasty }}</span>
                {{ poetry.author }}
              </p>
            </div>
            <div class="text-xs text-[var(--color-ink)]/40 font-mono">
              {{ poetry.content[0].substring(0, 10) }}...
            </div>
          </div>
        </div>
        
        <div v-if="isLoading && poetryList.length > 0" class="py-4 text-center">
           <span class="loading loading-spinner loading-sm text-[var(--color-theme)]"></span>
        </div>

        <div v-if="!isLoading && poetryList.length === 0" class="text-center py-10 text-[var(--color-ink)]/50">
          没有找到相关诗词
        </div>
      </div>
    </div>
  </div>
</template>
