<script setup lang="ts">
const config = useRuntimeConfig();
const apiBase = config.public.apiBase as string;

const route = useRoute();
const page = ref(Number(route.query.page || 1));

const { data, pending, error } = await useFetch(() => `${apiBase}/api/software`, {
  query: computed(() => ({
    page: page.value
  }))
});

const items = computed(() => data.value?.items || []);

function nextPage() {
  page.value += 1;
}

function prevPage() {
  if (page.value > 1) page.value -= 1;
}

const { t } = useI18n();
</script>

<template>
  <section>
    <h1 class="text-2xl font-semibold mb-4">{{ t("nav.allSoftware") }}</h1>
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
      <div class="grid gap-4 mb-4">
        <NuxtLink v-for="soft in items" :key="soft.id" :to="`/software/${soft.slug}`">
          <UCard class="hover:border-primary hover:shadow-sm transition">
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
          </UCard>
        </NuxtLink>
      </div>
      <div class="flex items-center gap-2">
        <UButton size="xs" :disabled="page === 1" @click="prevPage">
          上一页
        </UButton>
        <span class="text-sm text-slate-600">第 {{ page }} 页</span>
        <UButton size="xs" @click="nextPage">
          下一页
        </UButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 1rem;
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

.py-1 {
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}

.py-3 {
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
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

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.hover\:border-blue-500:hover {
  border-color: #3b82f6;
}
</style>

