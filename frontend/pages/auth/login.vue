<script setup lang="ts">
const config = useRuntimeConfig();
const apiBase = config.public.apiBase as string;

const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMsg = ref("");

const router = useRouter();

const { t } = useI18n();

async function handleLogin() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const res = await $fetch<{ token: string }>(`${apiBase}/api/auth/login`, {
      method: "POST",
      body: {
        email: email.value,
        password: password.value
      },
      credentials: "include"
    });
    if (res?.token) {
      await router.push("/");
    }
  } catch (e: any) {
    errorMsg.value = t("auth.login.error");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="max-w-sm mx-auto">
    <h1 class="text-2xl font-semibold mb-4">
      {{ t("auth.login.title") }}
    </h1>
    <form class="space-y-3" @submit.prevent="handleLogin">
      <div>
        <label class="block text-sm mb-1">
          {{ t("auth.login.email") }}
        </label>
        <input
          v-model="email"
          type="email"
          required
          class="w-full border rounded px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label class="block text-sm mb-1">
          {{ t("auth.login.password") }}
        </label>
        <input
          v-model="password"
          type="password"
          required
          class="w-full border rounded px-3 py-2 text-sm"
        />
      </div>
      <p v-if="errorMsg" class="text-sm text-red-600">
        {{ errorMsg }}
      </p>
      <button
        type="submit"
        class="w-full mt-2 px-4 py-2 text-sm rounded bg-blue-600 text-white"
        :disabled="loading"
      >
        {{ loading ? t("auth.login.submitting") : t("auth.login.submit") }}
      </button>
    </form>
    <p class="text-xs text-slate-600 mt-3">
      {{ t("auth.login.noAccount") }}
      <NuxtLink to="/auth/register" class="text-blue-600">
        {{ t("auth.login.toRegister") }}
      </NuxtLink>
    </p>
  </section>
</template>

<style scoped>
.max-w-sm {
  max-width: 24rem;
}

.mx-auto {
  margin-left: auto;
  margin-right: auto;
}

.mb-1 {
  margin-bottom: 0.25rem;
}

.mb-3 {
  margin-bottom: 0.75rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.mt-2 {
  margin-top: 0.5rem;
}

.mt-3 {
  margin-top: 0.75rem;
}

.space-y-3 > :not([hidden]) ~ :not([hidden]) {
  margin-top: 0.75rem;
}

.w-full {
  width: 100%;
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

.text-xs {
  font-size: 0.75rem;
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

.bg-blue-600 {
  background-color: #2563eb;
}

.text-white {
  color: #ffffff;
}
</style>

