<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { Poetry } from '@/types/poetry';
import { usePoetryStore } from '@/stores/poetry';
import { parseContentJson } from '@/utils/contentParser';

// Types
interface FilterOptions {
  dynasties: string[];
  tags: string[];
}

interface PoetryDisplay extends Poetry {
  previewLines: string[];
}

const emit = defineEmits<{
  (e: 'select', text: string): void
  (e: 'close'): void
}>();

const poetryStore = usePoetryStore();

// State
const poetryList = ref<PoetryDisplay[]>([]);
const filterOptions = ref<FilterOptions>({ dynasties: [], tags: [] });
const isLoading = ref(false);
const isLoadingOptions = ref(false);

// Filter State
const searchQuery = ref('');
const selectedDynasty = ref<string>('');
const selectedTag = ref<string>('');

// Pagination
const offset = ref(0);
const hasMore = ref(true);
const limit = 50;

// Load Filters
async function loadFilterOptions() {
  isLoadingOptions.value = true;
  try {
    const options = await invoke<FilterOptions>('get_filter_options');
    filterOptions.value = options;
  } catch (e) {
    console.error("Failed to load filter options:", e);
  } finally {
    isLoadingOptions.value = false;
  }
}

// Fetch Poetry
async function fetchPoetry(reset = true) {
  if (reset) {
    offset.value = 0;
    poetryList.value = [];
    hasMore.value = true;
  }
  
  if (!hasMore.value && !reset) return;

  isLoading.value = true;
  try {
    const results = await invoke<Poetry[]>('search_poetry', {
      keyword: searchQuery.value,
      dynasty: selectedDynasty.value || null,
      tag: selectedTag.value || null,
      offset: offset.value,
      limit: limit
    });
    
    if (results.length < limit) {
      hasMore.value = false;
    }

    const newItems = results.map(p => {
      let previewLines: string[] = [];
      try {
          const struct = parseContentJson(p.content_json);
          if (struct.paragraphs.length > 0) {
              previewLines = struct.paragraphs[0].lines;
          }
      } catch (e) {}

      return { ...p, previewLines } as PoetryDisplay;
    });

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

// Lifecycle
onMounted(() => {
  loadFilterOptions();
  fetchPoetry(true);
});

// Watchers
watch([searchQuery, selectedDynasty, selectedTag], () => {
  fetchPoetry(true);
});

// Infinite Scroll
function onScroll(e: Event) {
  const target = e.target as HTMLElement;
  if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
    if (!isLoading.value && hasMore.value) {
      fetchPoetry(false);
    }
  }
}

function selectPoetry(poetry: PoetryDisplay) {
  poetryStore.setCurrentPoetry(poetry);
  const text = poetryStore.plainText; 
  emit('select', text);
  emit('close');
}

// UI Helpers
const TAG_DISPLAY_MAP: Record<string, string> = {
  'shi': '古诗',
  'ci': '词',
  'qu': '曲',
  'wen': '文言文',
  'fu': '辞赋',
  'K12': '课本必背',
  'modern': '现代诗',
  '唐诗三百首': '唐诗三百首',
  '宋词三百首': '宋词三百首'
};

const getTagDisplay = (tag: string) => TAG_DISPLAY_MAP[tag] || tag;

const dynastyList = computed(() => ['全部', ...filterOptions.value.dynasties]);
const tagList = computed(() => ['全部', ...filterOptions.value.tags]);

</script>

<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="$emit('close')">
    <div class="bg-[var(--color-paper)] w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden text-[var(--color-ink)] border border-[var(--color-ink)]/10">
      
      <!-- Header & Search -->
      <div class="p-4 border-b border-[var(--color-ink)]/10 bg-[var(--color-theme)]/5 flex gap-4 items-center">
        <div class="flex-1 relative">
          <input 
            v-model.lazy="searchQuery" 
            type="text" 
            placeholder="🔍 搜索标题、作者、全文..." 
            class="input input-bordered w-full pl-10 bg-[var(--color-paper)] text-[var(--color-ink)]"
            @keyup.enter="fetchPoetry(true)"
          />
        </div>
        <button class="btn btn-circle btn-ghost btn-sm" @click="$emit('close')">✕</button>
      </div>

      <!-- Advanced Filter Panel -->
      <div class="p-4 border-b border-[var(--color-ink)]/10 bg-[var(--color-paper)] space-y-3">
        
        <!-- Dynasty Filter -->
        <div class="flex flex-wrap gap-2 items-center">
          <span class="text-xs font-bold opacity-50 mr-2">朝代</span>
          <button 
            v-for="d in dynastyList" 
            :key="d"
            class="btn btn-xs rounded-full normal-case transition-all"
            :class="(d === '全部' && !selectedDynasty) || d === selectedDynasty ? 'bg-[#C73E3A] text-white border-transparent hover:bg-[#A9332F]' : 'btn-ghost text-[var(--color-ink)] hover:bg-[#C73E3A]/10 hover:text-[#C73E3A]'"
            @click="selectedDynasty = (d === '全部' ? '' : d)"
          >
            {{ d }}
          </button>
        </div>

        <!-- Tag Filter -->
        <div class="flex flex-wrap gap-2 items-center">
          <span class="text-xs font-bold opacity-50 mr-2">分类</span>
          <button 
            v-for="t in tagList" 
            :key="t"
            class="btn btn-xs rounded-full normal-case transition-all"
            :class="(t === '全部' && !selectedTag) || t === selectedTag ? 'bg-[#4C6F8C] text-white border-transparent hover:bg-[#3A566E]' : 'btn-ghost text-[var(--color-ink)] hover:bg-[#4C6F8C]/10 hover:text-[#4C6F8C]'"
            @click="selectedTag = (t === '全部' ? '' : t)"
          >
            {{ getTagDisplay(t) }}
          </button>
        </div>
      </div>
      
      <!-- Results List -->
      <div 
        class="flex-1 overflow-y-auto p-4 bg-[var(--color-bg-canvas)] relative scrollbar-thin"
        @scroll="onScroll"
      >
        <!-- Grid Layout for Results -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div 
            v-for="poetry in poetryList" 
            :key="poetry.id"
            class="card bg-[var(--color-paper)] shadow-sm hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-[var(--color-theme)]/30 group h-32"
            @click="selectPoetry(poetry)"
          >
            <div class="card-body p-4">
              <div class="flex justify-between items-start">
                <h3 class="font-bold text-lg truncate text-[var(--color-ink)] group-hover:text-[var(--color-theme)]">{{ poetry.title }}</h3>
                <span class="badge badge-sm badge-ghost opacity-70">{{ poetry.dynasty }}</span>
              </div>
              <p class="text-sm opacity-60 truncate">{{ poetry.author }}</p>
              <p class="text-xs opacity-40 mt-auto truncate font-mono">
                {{ poetry.previewLines[0] || '暂无预览' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="py-8 text-center w-full">
           <span class="loading loading-spinner loading-lg text-[var(--color-theme)]"></span>
        </div>

        <!-- Empty State -->
        <div v-if="!isLoading && poetryList.length === 0" class="flex flex-col items-center justify-center h-64 text-[var(--color-ink)]/30">
          <div class="text-4xl mb-2">🍂</div>
          <p>未找到相关诗词</p>
        </div>
      </div>
      
      <!-- Footer Info -->
      <div class="p-2 border-t border-[var(--color-ink)]/10 bg-[var(--color-paper)] text-center text-xs opacity-40">
        已加载 {{ poetryList.length }} 首 • 滚动加载更多
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}
</style>
