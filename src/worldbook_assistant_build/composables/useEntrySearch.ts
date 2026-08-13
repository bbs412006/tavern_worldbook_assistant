import { computed, onScopeDispose, ref, watch, type Ref } from 'vue';

const SEARCH_DEBOUNCE_MS = 120;

type SearchableWorldbookEntry = Pick<WorldbookEntry, 'uid' | 'name' | 'content' | 'enabled' | 'strategy'>;

export function useEntrySearch<TEntry extends SearchableWorldbookEntry>(options: {
  entries: Ref<TEntry[]>;
  searchText: Ref<string>;
  onlyEnabled: Ref<boolean>;
  stringifyKeyword: (value: string | RegExp) => string;
}) {
  const debouncedSearchText = ref('');
  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  const entrySearchIndex = computed(() => new Map(
    options.entries.value.map(entry => [
      entry.uid,
      `${entry.name}\n${entry.content}\n${entry.strategy.keys.map(options.stringifyKeyword).join(' ')}`.toLowerCase(),
    ]),
  ));

  watch(options.searchText, value => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      debouncedSearchText.value = '';
      searchDebounceTimer = null;
      return;
    }
    searchDebounceTimer = setTimeout(() => {
      searchDebounceTimer = null;
      debouncedSearchText.value = normalized;
    }, SEARCH_DEBOUNCE_MS);
  }, { immediate: true });

  onScopeDispose(() => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
    }
  });

  const searchedEntries = computed(() => {
    const keyword = debouncedSearchText.value;
    return options.entries.value.filter(entry => {
      if (options.onlyEnabled.value && !entry.enabled) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return entrySearchIndex.value.get(entry.uid)?.includes(keyword) ?? false;
    });
  });

  return {
    debouncedSearchText,
    entrySearchIndex,
    searchedEntries,
  };
}
