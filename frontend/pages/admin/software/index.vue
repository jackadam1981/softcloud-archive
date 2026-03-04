<script setup lang="ts">
const config = useRuntimeConfig();
const apiBase = config.public.apiBase as string;

const q = ref("");
const page = ref(1);

const { data, pending, error, refresh } = await useFetch(() => `${apiBase}/api/admin/software`, {
  query: computed(() => ({
    q: q.value || undefined,
    page: page.value,
  })),
  headers: {
    // 管理接口依赖 ADMIN_TOKEN，实际部署时可通过反向代理或浏览器存储注入
    Authorization: `Bearer ${import.meta.env?.VITE_ADMIN_TOKEN || ""}`,
  },
});

const items = computed(() => data.value?.items || []);

const { t } = useI18n();
</script>

<template>
  <section>
    <h1 class="text-2xl font-semibold mb-4">
      {{ t("admin.softwareList.title") }}
    </h1>
    <div class="mb-4 flex gap-2">
      <UInput
        v-model="q"
        type="search"
        :placeholder="t('admin.softwareList.searchPlaceholder')"
        class="flex-1"
        size="sm"
      />
      <UButton size="sm" color="primary" @click="refresh">
        {{ t("admin.softwareList.search") }}
      </UButton>
    </div>

    <div v-if="pending" class="text-sm text-slate-600">
      {{ t("admin.softwareList.loading") }}
    </div>
    <div v-else-if="error" class="text-sm text-red-600">
      {{ t("admin.softwareList.loadError") }}
    </div>
    <div v-else>
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1 text-left">
              {{ t("admin.softwareList.table.id") }}
            </th>
            <th class="border px-2 py-1 text-left">
              {{ t("admin.softwareList.table.name") }}
            </th>
            <th class="border px-2 py-1 text-left">
              {{ t("admin.softwareList.table.slug") }}
            </th>
            <th class="border px-2 py-1 text-left">
              {{ t("admin.softwareList.table.version") }}
            </th>
            <th class="border px-2 py-1 text-left">
              {{ t("admin.softwareList.table.status") }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="soft in items" :key="soft.id" class="hover:bg-slate-50">
            <td class="border px-2 py-1">
              <NuxtLink :to="`/admin/software/${soft.id}`" class="text-blue-600">
                {{ soft.id }}
              </NuxtLink>
            </td>
            <td class="border px-2 py-1">{{ soft.name }}</td>
            <td class="border px-2 py-1">{{ soft.slug }}</td>
            <td class="border px-2 py-1">{{ soft.version || "-" }}</td>
            <td class="border px-2 py-1">
              <span v-if="soft.is_deleted">
                {{ t("admin.softwareList.table.statusDeleted") }}
              </span>
              <span v-else-if="soft.is_published">
                {{ t("admin.softwareList.table.statusPublished") }}
              </span>
              <span v-else>
                {{ t("admin.softwareList.table.statusDraft") }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 1rem;
}

.flex {
  display: flex;
}

.gap-2 {
  gap: 0.5rem;
}

.flex-1 {
  flex: 1 1 0%;
}

.border {
  border: 1px solid #e2e8f0;
}

.rounded {
  border-radius: 0.375rem;
}

.px-2 {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
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

.py-2 {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.text-sm {
  font-size: 0.875rem;
}

.text-2xl {
  font-size: 1.5rem;
}

.font-semibold {
  font-weight: 600;
}

.bg-blue-600 {
  background-color: #2563eb;
}

.text-white {
  color: #ffffff;
}

.text-slate-600 {
  color: #475569;
}

.text-red-600 {
  color: #dc2626;
}

.bg-slate-100 {
  background-color: #f1f5f9;
}
</style>

