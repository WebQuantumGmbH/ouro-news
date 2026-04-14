<template>
  <div class="bg-surface rounded-xl border border-border p-6">
    <h3 class="text-lg font-semibold mb-4">Semantische Suche</h3>
    <p class="text-sm text-text-muted mb-4">Beschreibe, wonach du suchst — die KI findet ähnliche Artikel.</p>

    <div class="flex gap-3">
      <input v-model="query" @keyup.enter="search" type="text"
        placeholder="z.B. 'Klimaschutzmaßnahmen in Asien' oder 'Spannungen zwischen NATO und Russland'"
        class="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
      <button @click="search" :disabled="loading || query.length < 3"
        class="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
        {{ loading ? 'Suche...' : 'Suchen' }}
      </button>
    </div>

    <div v-if="loading" class="text-center py-8">
      <div class="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p class="text-sm text-text-muted mt-2">Berechne Embedding & durchsuche Vektordatenbank...</p>
    </div>

    <div v-else-if="results.length > 0" class="mt-6 space-y-3">
      <div v-for="(item, i) in results" :key="item.id"
        class="flex items-start gap-4 p-4 bg-background rounded-lg">
        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
          {{ i + 1 }}
        </div>
        <div class="flex-1 min-w-0">
          <a :href="`/news/${item.payload?.article_id || ''}`"
            class="font-medium text-sm hover:text-primary transition-colors">
            {{ item.payload?.title }}
          </a>
          <div class="flex items-center gap-3 mt-1 text-xs text-text-muted">
            <span>Relevanz: {{ (item.score * 100).toFixed(1) }}%</span>
            <span v-if="item.payload?.source_country">{{ item.payload.source_country }}</span>
            <span v-if="item.payload?.sentiment_score != null"
              :class="item.payload.sentiment_score > 0.1 ? 'text-green-600' : item.payload.sentiment_score < -0.1 ? 'text-red-600' : 'text-yellow-600'">
              Sentiment: {{ item.payload.sentiment_score.toFixed(2) }}
            </span>
          </div>
          <div v-if="item.payload?.topics?.length" class="flex gap-1 mt-2">
            <span v-for="t in item.payload.topics" :key="t"
              class="text-xs px-2 py-0.5 bg-surface rounded-full border border-border">
              {{ t }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="searched" class="text-center py-8">
      <p class="text-text-muted">Keine ähnlichen Artikel gefunden.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface SearchResult {
  id: string;
  score: number;
  payload: {
    article_id: string;
    title: string;
    source_country: string;
    topics: string[];
    sentiment_score: number;
  };
}

const query = ref('');
const results = ref<SearchResult[]>([]);
const loading = ref(false);
const searched = ref(false);

async function search() {
  if (query.value.length < 3) return;
  loading.value = true;
  searched.value = true;

  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.value, limit: 10 }),
    });
    const data = await res.json();
    results.value = data.results || [];
  } catch (e) {
    console.error('Suchfehler:', e);
  } finally {
    loading.value = false;
  }
}
</script>
