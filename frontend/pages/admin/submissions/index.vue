<script setup lang="ts">
const config = useRuntimeConfig();
const apiBase = config.public.apiBase as string;

const status = ref("pending");

const { data, pending, error, refresh } = await useFetch(
  () => `${apiBase}/api/admin/submissions`,
  {
    query: computed(() => ({ status: status.value })),
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
      {{ t("admin.submissions.title") }}
    </h1>

    <div class="mb-4 flex gap-2 items-center text-sm">
      <label>状态：</label>
      <label>{{ t("admin.submissions.statusLabel") }}</label>
      <select v-model="status" class="border rounded px-2 py-1 text-sm" @change="refresh">
        <option value="pending">
          {{ t("admin.submissions.status.pending") }}
        </option>
        <option value="approved">
          {{ t("admin.submissions.status.approved") }}
        </option>
        <option value="rejected">
          {{ t("admin.submissions.status.rejected") }}
        </option>
      </select>
    </div>

    <div v-if="pending" class="text-sm text-slate-600">
      {{ t("admin.submissions.loading") }}
    </div>
    <div v-else-if="error" class="text-sm text-red-600">
      {{ t("admin.submissions.loadError") }}
    </div>
    <div v-else>
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1 text-left">
              {{ t("admin.submissions.table.id") }}
            </th>
            <th class="border px-2 py-1 text-left">
              {{ t("admin.submissions.table.user") }}
            </th>
            <th class="border px-2 py-1 text-left">
              {{ t("admin.submissions.table.title") }}
            </th>
            <th class="border px-2 py-1 text-left">
              {{ t("admin.submissions.table.status") }}
            </th>
            <th class="border px-2 py-1 text-left">
              {{ t("admin.submissions.table.createdAt") }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in items" :key="s.id" class="hover:bg-slate-50">
            <td class="border px-2 py-1">{{ s.id }}</td>
            <td class="border px-2 py-1">{{ s.user_id }}</td>
            <td class="border px-2 py-1">{{ s.title }}</td>
            <td class="border px-2 py-1">{{ s.status }}</td>
            <td class="border px-2 py-1 text-xs">{{ s.created_at }}</td>
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

.items-center {
  align-items: center;
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

.py-1 {
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}

.text-slate-600 {
  color: #475569;
}

.text-red-600 {
  color: #dc2626;
}

.text-xs {
  font-size: 0.75rem;
}

.bg-slate-100 {
  background-color: #f1f5f9;
}
</style>

