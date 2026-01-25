import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Poetry } from '../types/poetry';

export const useCollectionStore = defineStore('collection', () => {
  const favorites = ref<Poetry[]>([]);

  function toggleFavorite(poetry: Poetry) {
    const index = favorites.value.findIndex(p => p.id === poetry.id);
    if (index > -1) {
      favorites.value.splice(index, 1);
    } else {
      favorites.value.push(poetry);
    }
  }

  function isFavorite(id: string) {
    return favorites.value.some(p => p.id === id);
  }

  return {
    favorites,
    toggleFavorite,
    isFavorite
  };
}, {
  persist: true
});
