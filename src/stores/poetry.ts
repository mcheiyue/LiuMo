import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Poetry } from '@/types/poetry';
import { parseContentJson, generatePlainText } from '@/utils/contentParser';
import type { StructuredContent } from '@/utils/layoutEngine/types';

export const usePoetryStore = defineStore('poetry', () => {
  const currentPoetry = ref<Poetry | null>(null);

  // V8.0: Parse content_json (mandatory field now)
  const parsedContent = computed<StructuredContent | null>(() => {
    if (!currentPoetry.value?.content_json) return null;
    return parseContentJson(currentPoetry.value.content_json);
  });

  // V8.0: Use layout_strategy directly
  const layoutStrategy = computed(() => {
    return currentPoetry.value?.layout_strategy || 'CENTER_ALIGNED';
  });

  // Helper: Generate plain text for clipboard/legacy use
  const plainText = computed(() => {
    if (!parsedContent.value) return '';
    return generatePlainText(parsedContent.value);
  });

  function setCurrentPoetry(poetry: Poetry) {
      currentPoetry.value = poetry;
  }

  return {
    currentPoetry,
    parsedContent,
    layoutStrategy,
    plainText,
    setCurrentPoetry
  };
});
