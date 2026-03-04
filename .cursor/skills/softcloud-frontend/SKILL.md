---
name: softcloud-frontend
description: Focuses on building the SoftCloud Archive frontend in Nuxt 3/Vue 3, including pages for home, categories, software details, search, auth, and admin, integrating with the Workers API, and handling i18n/themes. Use when working in the frontend/ directory or designing UI/UX and client-side behavior.
---

# SoftCloud Frontend Assistant

## Role

- Acts as the **Nuxt 3 / Vue 3 frontend specialist** for SoftCloud Archive。
- 主要负责 `frontend/` Nuxt 项目，包括页面、组件、状态管理、i18n/主题与 API 对接。

## When to Use This Skill

Use this skill when:

- 在 `frontend/` 下创建或修改 Nuxt 页面与组件（包括 `/pages` 与 `app.vue`）。
- 设计首页、软件列表页、软件详情页、搜索页、登录/注册、后台管理等。
- 将前端与 Workers API（`/api/...`）进行联调。
- 处理多语言（`@nuxtjs/i18n`）与主题切换（`@nuxtjs/color-mode`）。
- 优化前端 UX / 性能 / SEO。

## Core Instructions

1. **技术栈与结构**
   - 使用 **Nuxt 3 + Vue 3 + TypeScript**：
     - 使用 `pages/` 目录自动生成路由。
     - `app.vue` 作为全局布局（导航栏、语言切换、主题切换等）。
   - 页面规划（示例）：
     - `/`：首页（推荐软件、搜索框、热门下载）。
     - `/software`：软件列表。
     - `/software/[slug]`：软件详情页（下载按钮、版本信息、描述等）。
     - `/auth/login`、`/auth/register`：登录/注册。
     - `/admin/...`：后台管理相关页面（软件列表、详情、存储后端、投稿审核等）。

2. **数据获取与 API 对接**
   - 所有业务数据通过 Workers API 获取，禁止直接访问数据库。
   - 配置环境变量 `NUXT_PUBLIC_API_BASE` 指向 Workers 域名，例如：
     - `http://127.0.0.1:8787`（本地）
     - `https://api.softcloud.example.com`（生产）
   - 使用 Nuxt 的组合式工具：
     - `useRuntimeConfig()` 读取 `public.apiBase`。
     - `useFetch` / `$fetch` 在页面或组件中请求数据。

3. **状态与会话**
   - 登录态由 **后端 Cookie (HttpOnly JWT)** 维护，前端通过：
     - 调用 `/api/auth/profile` 获取当前用户信息。
   - 避免在前端存储明文 Token，善用 Cookie + API。
   - 第一个注册的用户在后端会被标记为管理员，可直接访问后台。

4. **多语言与主题**
   - 多语言：
     - 使用 `@nuxtjs/i18n`，语言文件放在 `frontend/i18n/locales/*.json`。
     - 所有文案（导航、按钮、提示文本）优先使用 `t("...")`，避免硬编码。
   - 主题：
     - 使用 `@nuxtjs/color-mode` 提供亮色/暗色/跟随系统模式。
     - 在 `app.vue` 中通过 `useColorMode()` 实现切换。

5. **UI/UX 原则**
   - 保持 **简洁、清晰的下载流程**：用户在详情页一键点击“下载”按钮，前端只需调用 `/api/software/:slug/download`。
   - 所有耗时操作（搜索、登录、提交表单等）应有 Loading 状态与错误提示。
   - 支持基础的响应式布局，以桌面端为主，兼顾移动端。

6. **错误处理与反馈**
   - 后端错误统一为 JSON 格式 `{ error: "CODE" }`，前端根据 `CODE` 映射到 i18n 文案。
   - 对于未登录但访问受保护页面的情况，统一跳转到登录页并带上回跳参数。

## Implementation Checklist

在实现或修改前端功能时，逐项检查：

- [ ] 页面路由是否与产品/README 中的规划一致？
- [ ] 所有数据是否来自 Workers API，而非硬编码或绕过后端？
- [ ] 登录/个人中心等页面是否正确处理了未登录状态？
- [ ] 是否为各类接口调用提供了 Loading、错误提示与空状态？
- [ ] 是否使用了合适的 Next.js 数据获取方式（SSR/SSG/ISR/CSR）？
- [ ] 是否通过 `NEXT_PUBLIC_API_BASE` 配置了可切换的后端地址？

