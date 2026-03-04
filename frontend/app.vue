<script setup lang="ts">
const colorMode = useColorMode();
// 使用 nuxt-i18n 提供的全局 i18n 实例
const { locale, t, setLocale } = useI18n({ useScope: "global" });

const currentLocale = computed({
  get: () => locale.value,
  set: (val: string) => {
    // 通过 setLocale 告诉 nuxt-i18n 切换语言，保证路由/cookie 一致
    setLocale(val as any);
  },
});

const toggleTheme = () => {
  colorMode.preference = colorMode.value === "dark" ? "light" : "dark";
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <header class="border-b bg-white/80 backdrop-blur sticky top-0 z-20">
      <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold text-slate-900">
          <span>{{ t("nav.brand") }}</span>
        </NuxtLink>
        <nav class="flex items-center gap-4 text-sm">
          <NuxtLink to="/" class="hover:text-blue-600">
            {{ t("nav.home") }}
          </NuxtLink>
          <NuxtLink to="/software" class="hover:text-blue-600">
            {{ t("nav.allSoftware") }}
          </NuxtLink>
          <NuxtLink to="/auth/login" class="hover:text-blue-600">
            {{ t("nav.login") }}
          </NuxtLink>
          <NuxtLink to="/admin" class="hover:text-blue-600">
            {{ t("nav.admin") }}
          </NuxtLink>
          <select v-model="currentLocale" class="border rounded px-2 py-1 text-xs">
            <option value="zh-CN">简体中文</option>
            <option value="en">English</option>
          </select>
          <button class="text-xs px-2 py-1 border rounded" @click="toggleTheme">
            {{ colorMode.value === "dark" ? "☾" : "☀" }}
          </button>
        </nav>
      </div>
    </header>
    <main class="max-w-5xl mx-auto px-4 py-6">
      <NuxtPage />
    </main>
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

a {
  text-decoration: none;
}

.min-h-screen {
  min-height: 100vh;
}

.bg-slate-50 {
  background-color: #f8fafc;
}

.text-slate-900 {
  color: #0f172a;
}

.bg-white\/80 {
  background-color: rgba(255, 255, 255, 0.8);
}

.border-b {
  border-bottom: 1px solid #e2e8f0;
}

.max-w-5xl {
  max-width: 64rem;
}

.mx-auto {
  margin-left: auto;
  margin-right: auto;
}

.px-4 {
  padding-left: 1rem;
  padding-right: 1rem;
}

.py-3 {
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
}

.py-6 {
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.justify-between {
  justify-content: space-between;
}

.gap-2 {
  gap: 0.5rem;
}

.gap-4 {
  gap: 1rem;
}

.text-sm {
  font-size: 0.875rem;
}

.font-semibold {
  font-weight: 600;
}

.hover\:text-blue-600:hover {
  color: #2563eb;
}

.sticky {
  position: sticky;
}

.top-0 {
  top: 0;
}

.z-20 {
  z-index: 20;
}

/* Dark mode overrides */
.dark .bg-slate-50 {
  background-color: #020617;
}

.dark .text-slate-900 {
  color: #e5e7eb;
}
</style>

