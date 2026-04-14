<template>
  <div class="bg-surface rounded-xl border border-border p-6">
    <h3 class="text-lg font-semibold mb-4">Nachrichten filtern</h3>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <!-- Land -->
      <div>
        <label class="block text-xs font-medium text-text-muted mb-1">Land</label>
        <select v-model="filters.country" @change="applyFilters"
          class="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none">
          <option value="">Alle Länder</option>
          <option v-for="c in countries" :key="c.code" :value="c.code">{{ c.flag }} {{ c.name }}</option>
        </select>
      </div>

      <!-- Sentiment -->
      <div>
        <label class="block text-xs font-medium text-text-muted mb-1">Stimmung</label>
        <select v-model="filters.sentiment" @change="applyFilters"
          class="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none">
          <option value="">Alle</option>
          <option value="very_positive">Sehr Positiv</option>
          <option value="positive">Positiv</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negativ</option>
          <option value="very_negative">Sehr Negativ</option>
        </select>
      </div>

      <!-- Zeitraum -->
      <div>
        <label class="block text-xs font-medium text-text-muted mb-1">Seit</label>
        <input v-model="filters.since" @change="applyFilters" type="date"
          class="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
      </div>

      <!-- Freitextsuche -->
      <div>
        <label class="block text-xs font-medium text-text-muted mb-1">Suche</label>
        <input v-model="filters.q" @input="debounceApply" type="text" placeholder="Suchbegriff..."
          class="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
      </div>
    </div>

    <!-- Aktive Filter -->
    <div v-if="hasActiveFilters" class="flex items-center gap-2 flex-wrap">
      <span class="text-xs text-text-muted">Aktive Filter:</span>
      <button v-if="filters.country" @click="filters.country = ''; applyFilters()"
        class="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full hover:bg-primary/20 flex items-center gap-1">
        {{ filters.country }} ×
      </button>
      <button v-if="filters.sentiment" @click="filters.sentiment = ''; applyFilters()"
        class="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full hover:bg-primary/20 flex items-center gap-1">
        {{ filters.sentiment }} ×
      </button>
      <button @click="resetFilters" class="text-xs text-text-muted hover:text-primary ml-2">
        Alle zurücksetzen
      </button>
    </div>

    <!-- Ergebnisse -->
    <div v-if="loading" class="text-center py-8">
      <div class="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else-if="results.length > 0" class="mt-6 space-y-3">
      <a v-for="item in results" :key="item.id" :href="`/news/${item.slug}`"
        class="block p-4 bg-background rounded-lg hover:bg-primary/5 transition-colors">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h4 class="font-medium text-sm">{{ item.title }}</h4>
            <p v-if="item.summary" class="text-xs text-text-muted mt-1 line-clamp-2">{{ item.summary }}</p>
          </div>
          <span v-if="item.sentimentLabel" :class="sentimentClass(item.sentimentLabel)"
            class="text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
            {{ sentimentLabels[item.sentimentLabel] }}
          </span>
        </div>
      </a>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-2 mt-6">
      <button v-for="p in paginationPages" :key="p" @click="goToPage(p)"
        :class="p === pagination.page ? 'bg-primary text-white' : 'bg-background hover:bg-primary/10'"
        class="w-8 h-8 rounded-lg text-sm font-medium transition-colors">
        {{ p }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';

interface NewsItem {
  id: string;
  title: string;
  summary: string | null;
  slug: string;
  sentimentLabel: string | null;
  publishedAt: string | null;
}

const countries = [
  { code: 'DE', name: 'Deutschland', flag: '🇩🇪' },
  { code: 'US', name: 'USA', flag: '🇺🇸' },
  { code: 'RU', name: 'Russland', flag: '🇷🇺' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'GB', name: 'Großbritannien', flag: '🇬🇧' },
  { code: 'FR', name: 'Frankreich', flag: '🇫🇷' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'IN', name: 'Indien', flag: '🇮🇳' },
];

const sentimentLabels: Record<string, string> = {
  very_positive: 'Sehr Positiv', positive: 'Positiv', neutral: 'Neutral',
  negative: 'Negativ', very_negative: 'Sehr Negativ',
};

const filters = reactive({ country: '', sentiment: '', since: '', q: '' });
const results = ref<NewsItem[]>([]);
const loading = ref(false);
const pagination = reactive({ page: 1, total: 0, totalPages: 0 });

let debounceTimer: ReturnType<typeof setTimeout>;

const hasActiveFilters = computed(() => filters.country || filters.sentiment || filters.since || filters.q);

const paginationPages = computed(() => {
  const pages: number[] = [];
  const start = Math.max(1, pagination.page - 2);
  const end = Math.min(pagination.totalPages, pagination.page + 2);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});

function sentimentClass(label: string): string {
  if (label.includes('positive')) return 'bg-green-100 text-green-700';
  if (label.includes('negative')) return 'bg-red-100 text-red-700';
  return 'bg-yellow-100 text-yellow-700';
}

async function applyFilters() {
  loading.value = true;
  const params = new URLSearchParams();
  params.set('page', String(pagination.page));
  params.set('limit', '20');
  if (filters.country) params.set('country', filters.country);
  if (filters.sentiment) params.set('sentiment', filters.sentiment);
  if (filters.since) params.set('since', filters.since);
  if (filters.q) params.set('q', filters.q);

  try {
    const res = await fetch(`/api/news?${params}`);
    const data = await res.json();
    results.value = data.data;
    Object.assign(pagination, data.pagination);
  } catch (e) {
    console.error('Filter-Fehler:', e);
  } finally {
    loading.value = false;
  }
}

function debounceApply() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(applyFilters, 400);
}

function goToPage(p: number) {
  pagination.page = p;
  applyFilters();
}

function resetFilters() {
  Object.assign(filters, { country: '', sentiment: '', since: '', q: '' });
  pagination.page = 1;
  applyFilters();
}
</script>
