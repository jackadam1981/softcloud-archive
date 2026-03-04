// Nuxt 3 configuration for SoftCloud Archive
export default defineNuxtConfig({
  srcDir: ".",
  typescript: {
    strict: true,
  },
  runtimeConfig: {
    public: {
      // 使用 import.meta.env 以避免 TS 对 process 的类型报错
      apiBase: (import.meta as any).env?.NUXT_PUBLIC_API_BASE || "http://localhost:8787",
    },
  },
  // 启用官方 i18n + 主题模块
  modules: ["@nuxtjs/i18n", "@nuxtjs/color-mode"],
  // i18n 配置：每个语言一个文件（locales 目录）
  // @ts-expect-error: i18n module runtime config
  i18n: {
    strategy: "no_prefix",
    locales: [
      { code: "zh-CN", iso: "zh-CN", name: "简体中文", file: "zh-CN.json" },
      { code: "en", iso: "en-US", name: "English", file: "en.json" }
    ],
    defaultLocale: "zh-CN",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_redirected",
      redirectOn: "root"
    },
    lazy: true,
    langDir: "locales",
    // 仅提供全局选项（如 legacy / fallback），具体文案从 locales/*.json 读取
    vueI18n: "./i18n.config.ts"
  },
  colorMode: {
    preference: "system",
    fallback: "light",
    classSuffix: "",
  },
  app: {
    head: {
      title: "SoftCloud Archive - 云端软件下载站",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content: "类似华军软件园的云端软件下载站，基于 Cloudflare + OpenList 网盘。",
        },
      ],
    },
  },
});

