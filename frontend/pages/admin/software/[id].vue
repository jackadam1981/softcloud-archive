<script setup lang="ts">
const config = useRuntimeConfig();
const apiBase = config.public.apiBase as string;
const route = useRoute();

const id = Number(route.params.id);

const adminHeaders = {
  Authorization: `Bearer ${import.meta.env?.VITE_ADMIN_TOKEN || ""}`,
};

const { data: softwareData, pending, error, refresh } = await useFetch(
  () => `${apiBase}/api/admin/software`,
  {
    query: { page: 1, pageSize: 1, id },
    headers: adminHeaders,
  }
);

const software = computed(() => {
  const items = (softwareData.value as any)?.items || [];
  return items.find((it: any) => it.id === id) || null;
});

const { data: filesData } = await useFetch(
  () => `${apiBase}/api/admin/software/${id}/files`,
  { headers: adminHeaders }
);
const files = computed(() => (filesData.value as any)?.items || []);

const { data: sourcesData } = await useFetch(
  () => `${apiBase}/api/admin/software/${id}/sources`,
  { headers: adminHeaders }
);
const sources = computed(() => (sourcesData.value as any)?.items || []);

const { t } = useI18n();
</script>

<template>
  <section>
    <div v-if="pending" class="text-sm text-slate-600">
      {{ t("admin.softwareDetail.loading") }}
    </div>
    <div v-else-if="error" class="text-sm text-red-600">
      {{ t("admin.softwareDetail.loadError") }}
    </div>
    <div v-else-if="!software" class="text-sm text-slate-600">
      {{ t("admin.softwareDetail.notFound") }}
    </div>
    <div v-else>
      <h1 class="text-2xl font-semibold mb-2">
        {{ t("admin.softwareDetail.loading") }} #{{ software.id }} - {{ software.name }}
      </h1>
      <p class="text-sm text-slate-600 mb-4">
        Slug: {{ software.slug }} · v{{ software.version || "-" }}
      </p>

      <h2 class="text-lg font-semibold mb-2">
        {{ t("admin.softwareDetail.filesTitle") }}
      </h2>
      <table class="w-full text-sm border-collapse mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1 text-left">
              {{ t("admin.softwareDetail.files.id") }}
            </th>
            <th class="border px-2 py-1 text-left">
              {{ t("admin.softwareDetail.files.label") }}
            </th>
            <th class="border px-2 py-1 text-left">
              {{ t("admin.softwareDetail.files.backend") }}
            </th>
            <th class="border px-2 py-1 text-left">
              {{ t("admin.softwareDetail.files.path") }}
            </th>
            <th class="border px-2 py-1 text-left">
              {{ t("admin.softwareDetail.files.primary") }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in files" :key="f.id" class="hover:bg-slate-50">
            <td class="border px-2 py-1">{{ f.id }}</td>
            <td class="border px-2 py-1">{{ f.label || "-" }}</td>
            <td class="border px-2 py-1">
              {{ f.backend_name || f.backend_code || f.backend_type || "-" }}
            </td>
            <td class="border px-2 py-1 text-xs">{{ f.file_path || "-" }}</td>
            <td class="border px-2 py-1">
              <span v-if="f.is_primary">
                {{ t("admin.softwareDetail.files.yes") }}
              </span>
              <span v-else>
                {{ t("admin.softwareDetail.files.no") }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <h2 class="text-lg font-semibold mb-2">
        {{ t("admin.softwareDetail.sourcesTitle") }}
      </h2>
      <table class="w-full text-sm border-collapse mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1 text-left">
              {{ t("admin.softwareDetail.sources.id") }}
            </th>
            <th class="border px-2 py-1 text-left">
              {{ t("admin.softwareDetail.sources.type") }}
            </th>
            <th class="border px-2 py-1 text-left">
              {{ t("admin.softwareDetail.sources.enabled") }}
            </th>
            <th class="border px-2 py-1 text-left">
              {{ t("admin.softwareDetail.sources.lastChecked") }}
            </th>
            <th class="border px-2 py-1 text-left">
              {{ t("admin.softwareDetail.sources.lastError") }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in sources" :key="s.id" class="hover:bg-slate-50">
            <td class="border px-2 py-1">{{ s.id }}</td>
            <td class="border px-2 py-1">{{ s.source_type }}</td>
            <td class="border px-2 py-1">
              <span v-if="s.enabled">是</span>
              <span v-else>否</span>
            </td>
            <td class="border px-2 py-1 text-xs">
              {{ s.last_checked_at || "-" }}
            </td>
            <td class="border px-2 py-1 text-xs text-red-600">
              {{ s.last_error || "-" }}
            </td>
          </tr>
        </tbody>
      </table>

      <p class="text-xs text-slate-500">
        {{ t("admin.softwareDetail.note") }}
      </p>
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

.text-xs {
  font-size: 0.75rem;
}

.text-sm {
  font-size: 0.875rem;
}

.text-lg {
  font-size: 1.125rem;
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

.text-red-600 {
  color: #dc2626;
}

.bg-slate-100 {
  background-color: #f1f5f9;
}

.border {
  border: 1px solid #e2e8f0;
}

.px-2 {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.py-1 {
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}
</style>

