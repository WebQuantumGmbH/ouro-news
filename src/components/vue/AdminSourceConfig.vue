<template>
  <div class="space-y-6">
    <!-- Neue Quelle hinzufügen -->
    <div class="bg-white rounded-xl border border-gray-200 p-6">
      <h2 class="text-lg font-semibold mb-4">Neue Quelle hinzufügen</h2>
      <form @submit.prevent="createSource" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Name</label>
          <input v-model="form.name" type="text" required placeholder="z.B. Tagesschau RSS"
            class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-700/30 focus:border-green-700 outline-none" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Typ</label>
          <select v-model="form.type" required
            class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-700/30 focus:border-green-700 outline-none">
            <option value="rss">RSS/Atom Feed</option>
            <option value="api">News-API</option>
            <option value="scraper">Web-Scraper (Apify)</option>
            <option value="social">Social Media</option>
          </select>
        </div>
        <div class="sm:col-span-2">
          <label class="block text-xs font-medium text-gray-500 mb-1">URL</label>
          <input v-model="form.url" type="url" required placeholder="https://..."
            class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-700/30 focus:border-green-700 outline-none" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Land (ISO)</label>
          <input v-model="form.country" type="text" maxlength="5" placeholder="DE"
            class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-700/30 focus:border-green-700 outline-none" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Sprache (ISO)</label>
          <input v-model="form.language" type="text" maxlength="5" placeholder="de"
            class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-700/30 focus:border-green-700 outline-none" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Update-Intervall (Min.)</label>
          <input v-model.number="form.updateIntervalMinutes" type="number" min="5" placeholder="60"
            class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-700/30 focus:border-green-700 outline-none" />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-xs font-medium text-gray-500 mb-1">Zusätzliche Konfiguration (JSON)</label>
          <textarea v-model="form.configJson" rows="3" placeholder='{"apiKey": "...", "query": "climate change"}'
            class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-green-700/30 focus:border-green-700 outline-none resize-none" />
        </div>
        <div class="sm:col-span-2">
          <button type="submit" :disabled="saving"
            class="px-6 py-2.5 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
            {{ saving ? 'Speichern...' : 'Quelle hinzufügen' }}
          </button>
          <span v-if="message" class="ml-3 text-sm text-green-700">{{ message }}</span>
        </div>
      </form>
    </div>

    <!-- Bestehendes Quellen-Liste -->
    <div class="bg-white rounded-xl border border-gray-200 p-6">
      <h2 class="text-lg font-semibold mb-4">Konfigurierte Quellen</h2>

      <div v-if="loading" class="text-center py-4">
        <div class="inline-block w-6 h-6 border-2 border-green-700 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="sourcesList.length === 0" class="text-center py-8 text-gray-500">
        Noch keine Quellen konfiguriert.
      </div>

      <div v-else class="space-y-3">
        <div v-for="src in sourcesList" :key="src.id"
          class="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-medium text-sm">{{ src.name }}</span>
              <span class="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">{{ src.type }}</span>
              <span class="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">{{ src.country }}</span>
              <span :class="src.is_active ? 'text-green-600' : 'text-red-600'" class="text-xs">
                {{ src.is_active ? '● Aktiv' : '○ Inaktiv' }}
              </span>
            </div>
            <p class="text-xs text-gray-500 mt-1 truncate max-w-md">{{ src.url }}</p>
            <p v-if="src.last_fetched_at" class="text-xs text-gray-400 mt-0.5">
              Letzter Abruf: {{ new Date(src.last_fetched_at).toLocaleString('de-DE') }}
            </p>
          </div>
          <button @click="deleteSource(src.id)"
            class="text-xs text-red-600 hover:text-red-800 px-3 py-1 rounded hover:bg-red-50 transition-colors">
            Löschen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';

interface Source {
  id: string;
  name: string;
  type: string;
  url: string;
  country: string;
  language: string;
  is_active: boolean;
  last_fetched_at: string | null;
}

const form = reactive({
  name: '',
  type: 'rss' as string,
  url: '',
  country: 'DE',
  language: 'de',
  updateIntervalMinutes: 60,
  configJson: '',
});

const sourcesList = ref<Source[]>([]);
const loading = ref(true);
const saving = ref(false);
const message = ref('');

async function loadSources() {
  loading.value = true;
  try {
    const res = await fetch('/api/admin/sources');
    const data = await res.json();
    sourcesList.value = data.sources;
  } catch (e) {
    console.error('Fehler beim Laden:', e);
  } finally {
    loading.value = false;
  }
}

async function createSource() {
  saving.value = true;
  message.value = '';
  try {
    let config = {};
    if (form.configJson.trim()) {
      config = JSON.parse(form.configJson);
    }
    const res = await fetch('/api/admin/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        type: form.type,
        url: form.url,
        country: form.country,
        language: form.language,
        updateIntervalMinutes: form.updateIntervalMinutes,
        config,
      }),
    });
    if (res.ok) {
      message.value = 'Quelle erfolgreich erstellt!';
      form.name = '';
      form.url = '';
      form.configJson = '';
      await loadSources();
    }
  } catch (e) {
    message.value = 'Fehler beim Erstellen';
  } finally {
    saving.value = false;
  }
}

async function deleteSource(id: string) {
  if (!confirm('Quelle wirklich löschen?')) return;
  try {
    await fetch('/api/admin/sources', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await loadSources();
  } catch (e) {
    console.error('Fehler beim Löschen:', e);
  }
}

onMounted(loadSources);
</script>
