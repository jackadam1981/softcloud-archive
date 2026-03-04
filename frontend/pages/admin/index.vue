<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
  <section>
    <h1 class="text-2xl font-semibold mb-4">
      {{ t("admin.dashboard") }}
    </h1>
    <ul class="space-y-2 text-sm">
      <li>
        <NuxtLink to="/admin/software" class="text-blue-600">
          {{ t("admin.menu.software") }}
        </NuxtLink>
      </li>
      <li>
        <NuxtLink to="/admin/storage-backends" class="text-blue-600">
          {{ t("admin.menu.storage") }}
        </NuxtLink>
      </li>
      <li>
        <NuxtLink to="/admin/submissions" class="text-blue-600">
          {{ t("admin.menu.submissions") }}
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 1rem;
}

.space-y-2 > :not([hidden]) ~ :not([hidden]) {
  margin-top: 0.5rem;
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

.text-blue-600 {
  color: #2563eb;
}
</style>

