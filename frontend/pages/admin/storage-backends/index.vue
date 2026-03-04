<script setup lang="ts">
const config = useRuntimeConfig();
const apiBase = config.public.apiBase as string;

const { data, pending, error, refresh } = await useFetch(
  () => `${apiBase}/api/admin/storage-backends`,
  {
    headers: {
      Authorization: `Bearer ${import.meta.env?.VITE_ADMIN_TOKEN || ""}`,
    },
  }
);

const items = computed(() => (data.value as any)?.items || []);

const { t } = useI18n();
</script>

<template>
  <section>
    <h1 class="text-2xl font-semibold mb-4">
      {{ t("admin.storage.title") }}
    </h1>
    <div v-if="pending" class="text-sm text-slate-600">
      {{ t("admin.storage.loading") }}
    </div>
    <div v-else-if="error" class="text-sm text-red-600">
      {{ t("admin.storage.loadError") }}
    </div>
    <div v-else>
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1 text-left">
              {{ t("admin.storage.table.id") }}
            </th>
            <th class="border px-2 py-1 text-left">
              {{ t("admin.storage.table.name") }}
            </th>
            <th class="border px-2 py-1 text-left">
              {{ t("admin.storage.table.type") }}
            </th>
            <th class="border px-2 py-1 text-left">
              {{ t("admin.storage.table.code") }}
            </th>
            <th class="border px-2 py-1 text-left">
              {{ t("admin.storage.table.enabled") }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in items" :key="b.id" class="hover:bg-slate-50">
            <td class="border px-2 py-1">{{ b.id }}</td>
            <td class="border px-2 py-1">{{ b.name }}</td>
            <td class="border px-2 py-1">{{ b.type }}</td>
            <td class="border px-2 py-1">{{ b.code || "-" }}</td>
            <td class="border px-2 py-1">
              <span v-if="b.is_active">
                {{ t("admin.storage.table.yes") }}
              </span>
              <span v-else>
                {{ t("admin.storage.table.no") }}
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

.text-sm {
  font-size: 0.875rem;
}

.text-2xl {
  font-size: 1.5rem;
}

.font-semibold {
  font-weight: 600;
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

