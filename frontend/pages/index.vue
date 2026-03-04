<script setup lang="ts">
const config = useRuntimeConfig();
const apiBase = config.public.apiBase as string;

const search = ref("");

const { data, pending, error, refresh } = await useFetch(() => `${apiBase}/api/software`, {
  query: computed(() => ({
    q: search.value || undefined
  }))
});

const items = computed(() => data.value?.items || []);

const { data: topData } = await useFetch(() => `${apiBase}/api/stats/top-downloads`, {
  query: { days: 30, limit: 5 }
});
const topItems = computed(() => topData.value?.items || []);

const { t } = useI18n();
</script>

<template>
  <section>
    <h1 class="text-2xl font-semibold mb-4">{{ t("home.title") }}</h1>
    <p class="text-slate-600 mb-4">
      {{ t("home.subtitle") }}
    </p>

    <div class="mb-6 flex gap-2">
      <input
        v-model="search"
        type="search"
        class="flex-1 border rounded px-3 py-2 text-sm"
        :placeholder="t('home.searchPlaceholder')"
      />
      <button
        class="px-4 py-2 text-sm rounded bg-blue-600 text-white"
        type="button"
        @click="refresh"
      >
        {{ t("home.searchButton") }}
      </button>
    </div>

    <div v-if="pending" class="text-sm text-slate-600">
      {{ t("home.loading") }}
    </div>
    <div v-else-if="error" class="text-sm text-red-600">
      {{ t("home.loadError") }}
    </div>
    <div v-else>
      <div v-if="items.length === 0" class="text-sm text-slate-600">
        {{ t("home.empty") }}
      </div>
      <div class="grid gap-4">
        <NuxtLink
          v-for="soft in items"
          :key="soft.id"
          :to="`/software/${soft.slug}`"
        >
          <div
            class="border rounded px-4 py-3 hover:border-blue-500 hover:shadow-sm transition bg-white"
          >
            <div class="flex justify-between items-start gap-4">
              <div>
                <h2 class="font-semibold">
                  {{ soft.name }}
                  <span v-if="soft.version" class="text-xs text-slate-500 ml-2">
                    v{{ soft.version }}
                  </span>
                </h2>
                <p class="text-xs text-slate-500 mt-1 line-clamp-2">
                  {{ soft.short_desc || t("home.empty") }}
                </p>
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <div v-if="topItems.length" class="mt-8">
      <h2 class="text-xl font-semibold mb-3">{{ t("home.hotDownloads") }}</h2>
      <ul class="text-sm space-y-1">
        <li v-for="(soft, idx) in topItems" :key="soft.id">
          <span class="text-slate-500 mr-2">{{ idx + 1 }}.</span>
          <NuxtLink :to="`/software/${soft.slug}`" class="text-blue-600">
            {{ soft.name }}
          </NuxtLink>
          <span class="text-slate-500 ml-2">
            ({{ soft.download_count }} {{ t("home.hotSuffix") }})
          </span>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 1rem;
}

.mb-6 {
  margin-bottom: 1.5rem;
}

.mt-8 {
  margin-top: 2rem;
}

.grid {
  display: grid;
}

.gap-4 {
  gap: 1rem;
}

.border {
  border: 1px solid #e2e8f0;
}

.rounded {
  border-radius: 0.375rem;
}

.px-3 {
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

.px-4 {
  padding-left: 1rem;
  padding-right: 1rem;
}

.py-2 {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.py-3 {
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
}

.flex-1 {
  flex: 1 1 0%;
}

.text-xs {
  font-size: 0.75rem;
}

.text-sm {
  font-size: 0.875rem;
}

.font-semibold {
  font-weight: 600;
}

.text-slate-500 {
  color: #64748b;
}

.text-slate-600 {
  color: #475569;
}

.text-red-600 {
  color: #dc2626;
}

.bg-white {
  background-color: #ffffff;
}

.bg-blue-600 {
  background-color: #2563eb;
}

.text-white {
  color: #ffffff;
}

.hover\:border-blue-500:hover {
  border-color: #3b82f6;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.text-xl {
  font-size: 1.25rem;
}

.space-y-1 > :not([hidden]) ~ :not([hidden]) {
  margin-top: 0.25rem;
}

.text-blue-600 {
  color: #2563eb;
}
</style>

