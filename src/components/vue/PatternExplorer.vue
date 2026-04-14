<template>
  <div class="bg-surface rounded-xl border border-border p-6">
    <h3 class="text-lg font-semibold mb-4">Historische Muster erkennen</h3>
    <p class="text-sm text-text-muted mb-4">
      Beschreibe die aktuelle Situation — die KI sucht nach historischen Parallelen in der Nachrichtenlandschaft.
    </p>

    <textarea v-model="situation" rows="4"
      placeholder="z.B. 'Steigende Spannungen zwischen X und Y, vermehrte Militärbewegungen, diplomatische Kanäle werden eingestellt, mediale Kriegsrhetorik nimmt zu...'"
      class="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none resize-none" />

    <button @click="analyze" :disabled="loading || situation.length < 10"
      class="mt-3 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
      {{ loading ? 'Analysiere Muster...' : 'Muster suchen' }}
    </button>

    <div v-if="loading" class="mt-6 text-center py-8">
      <div class="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p class="text-sm text-text-muted mt-3">Durchsuche historische Muster & analysiere Parallelen...</p>
    </div>

    <div v-else-if="result" class="mt-6 space-y-6">
      <!-- Similarity Score -->
      <div class="flex items-center gap-4 p-4 bg-background rounded-lg">
        <div class="text-3xl font-bold" :class="scoreColor">
          {{ (result.similarity_score * 100).toFixed(0) }}%
        </div>
        <div>
          <p class="font-medium text-sm">Übereinstimmung mit historischem Muster</p>
          <p class="text-xs text-text-muted">{{ result.historical_parallel }}</p>
        </div>
      </div>

      <!-- Aktuelle Einordnung -->
      <div class="p-4 bg-background rounded-lg">
        <h4 class="text-sm font-semibold mb-2">Einordnung der aktuellen Situation</h4>
        <p class="text-sm text-text-muted">{{ result.current_situation }}</p>
      </div>

      <!-- Gemeinsamkeiten & Unterschiede -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 bg-red-50 rounded-lg">
          <h4 class="text-sm font-semibold text-red-800 mb-2">Gemeinsamkeiten</h4>
          <ul class="space-y-1">
            <li v-for="s in result.key_similarities" :key="s" class="text-xs text-red-700 flex gap-2">
              <span>⚠️</span> {{ s }}
            </li>
          </ul>
        </div>
        <div class="p-4 bg-green-50 rounded-lg">
          <h4 class="text-sm font-semibold text-green-800 mb-2">Unterschiede</h4>
          <ul class="space-y-1">
            <li v-for="d in result.key_differences" :key="d" class="text-xs text-green-700 flex gap-2">
              <span>✓</span> {{ d }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Risikobewertung -->
      <div class="p-4 bg-yellow-50 rounded-lg">
        <h4 class="text-sm font-semibold text-yellow-800 mb-2">Risikobewertung</h4>
        <p class="text-sm text-yellow-700">{{ result.risk_assessment }}</p>
      </div>

      <!-- Monitoring-Empfehlung -->
      <div class="p-4 bg-background rounded-lg">
        <h4 class="text-sm font-semibold mb-2">Empfohlene Beobachtungspunkte</h4>
        <ul class="space-y-1">
          <li v-for="m in result.recommended_monitoring" :key="m" class="text-xs text-text-muted flex gap-2">
            <span>📊</span> {{ m }}
          </li>
        </ul>
      </div>
    </div>

    <div v-else-if="noPatterns" class="mt-6 text-center py-8 bg-background rounded-lg">
      <p class="text-text-muted">Noch nicht genug historische Daten für Mustervergleich.</p>
      <p class="text-sm text-text-muted mt-1">Es werden mindestens 50+ analysierte Artikel benötigt.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface PatternAnalysis {
  similarity_score: number;
  historical_parallel: string;
  current_situation: string;
  key_similarities: string[];
  key_differences: string[];
  risk_assessment: string;
  recommended_monitoring: string[];
}

const situation = ref('');
const result = ref<PatternAnalysis | null>(null);
const loading = ref(false);
const noPatterns = ref(false);

const scoreColor = computed(() => {
  if (!result.value) return '';
  const s = result.value.similarity_score;
  if (s > 0.7) return 'text-red-600';
  if (s > 0.4) return 'text-yellow-600';
  return 'text-green-600';
});

async function analyze() {
  if (situation.value.length < 10) return;
  loading.value = true;
  result.value = null;
  noPatterns.value = false;

  try {
    const res = await fetch('/api/patterns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ situation: situation.value }),
    });
    const data = await res.json();
    if (data.analysis) {
      result.value = data.analysis;
    } else {
      noPatterns.value = true;
    }
  } catch (e) {
    console.error('Pattern-Fehler:', e);
  } finally {
    loading.value = false;
  }
}
</script>
