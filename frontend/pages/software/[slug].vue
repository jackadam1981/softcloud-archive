<script setup lang="ts">
const config = useRuntimeConfig();
const apiBase = config.public.apiBase as string;
const route = useRoute();

const slug = route.params.slug as string;

const { data, pending, error } = await useFetch(() => `${apiBase}/api/software/${slug}`);
const software = computed(() => data.value?.software);

const downloading = ref(false);

async function handleDownload() {
  if (!software.value) return;
  downloading.value = true;
  try {
    const url = `${apiBase}/api/software/${slug}/download`;
    window.location.href = url;
  } finally {
    downloading.value = false;
  }
}

const { t } = useI18n();
</script>

<template>
  <section>
    <div v-if="pending" class="text-sm text-slate-600">
      {{ t("home.loading") }}
    </div>
    <div v-else-if="error" class="text-sm text-red-600">
      {{ t("home.loadError") }}
    </div>
    <div v-else-if="!software" class="text-sm text-slate-600">
      {{ t("home.empty") }}
    </div>
    <div v-else>
      <h1 class="text-2xl font-semibold mb-2">
        {{ software.name }}
        <span v-if="software.version" class="text-base text-slate-500 ml-2">v{{ software.version }}</span>
      </h1>
      <p class="text-sm text-slate-600 mb-4">
        {{ software.short_desc || t("home.empty") }}
      </p>

      <div class="mb-4">
        <UButton size="sm" color="primary" :loading="downloading" @click="handleDownload">
          {{ downloading ? "跳转中..." : "立即下载" }}
        </UButton>
      </div>

      <article v-if="software.long_desc" class="prose text-sm text-slate-700">
        <pre style="white-space: pre-wrap">{{ software.long_desc }}</pre>
      </article>
    </div>
  </section>
</template>

<style scoped>
.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.text-sm {
  font-size: 0.875rem;
}

.text-base {
  font-size: 1rem;
}

.text-2xl {
  font-size: 1.5rem;
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

.text-slate-700 {
  color: #334155;
}

.px-4 {
  padding-left: 1rem;
  padding-right: 1rem;
}

.py-2 {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.bg-blue-600 {
  background-color: #2563eb;
}

.text-white {
  color: #ffffff;
}

.rounded {
  border-radius: 0.375rem;
}

.prose pre {
  font-family: inherit;
}
</style>

