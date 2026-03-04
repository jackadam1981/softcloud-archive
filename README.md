## SoftCloud Archive

SoftCloud Archive 是一个类似 **华军软件园** 的云端软件下载站：

- **前端**：基于 **Nuxt 3 + Vue 3**，部署在 **Cloudflare Pages**，支持 **中英文多语言切换** 与 **深浅色主题**。
- **后端**：基于 **Cloudflare Workers + D1**，提供 RESTful API 与数据存储。
- **文件存储**：使用 **OpenList** 聚合各类网盘，通过 **WebDAV** 上传，通过 **分享链接** 下载。

软件的二进制安装包完全存放在网盘中，Cloudflare 只负责元数据与中转跳转。

---

## 功能概览

- **软件下载站**
  - 按分类 / 平台 / 关键字浏览和搜索软件。
  - 查看软件详情、版本信息与长描述（Markdown）。
- **下载页面**
  - 点击“下载”按钮 → 记录下载日志 → 302 重定向到 OpenList 分享链接。
- **用户系统（基础版）**
  - 邮箱注册 / 登录、查看和修改个人资料。
  - 第一个注册的用户自动成为管理员（后续登录可直接访问后台）。
  - 后续已为收藏、评论、投稿等扩展预留表结构和接口。
- **后台管理**
  - 管理软件元数据、版本、上下架状态与 OpenList 链接。
  - 管理存储后端、多文件映射、用户投稿与审核。
- **多语言与主题**
  - 提供中文 / 英文双语言包，所有页面文案均从语言文件加载。
  - 支持亮色 / 暗色主题切换。
- **架构扩展能力**
  - 多存储后端抽象、自动升级源（GitHub / HTML）、批量导入、推荐/统计等，在架构上均已预留。

详细的架构级 TODO 见 `ARCHITECTURE-TODO.md`。

---

## 技术架构

- **前端：Nuxt 3 / Vue 3（`frontend/`）**
  - 部署在 Cloudflare Pages。
  - 使用静态生成（Generate）与调用 Workers API 的混合模式。
  - 多语言：基于 `@nuxtjs/i18n`，语言文件放在 `frontend/i18n/locales/*.json`（每个语言一个文件，例如 `zh-CN.json` / `en.json`）。
  - 主题：基于 `@nuxtjs/color-mode`，支持系统 / 亮色 / 暗色模式。
  - 主要页面：
    - 首页：搜索 + 简单推荐。
    - 软件列表页：分页展示全部软件。
    - 软件详情页：展示版本、简介、长描述（Markdown 渲染）、下载按钮。
    - 登录 / 注册页：对接 `/api/auth/*`。
    - 后续可扩展“我的收藏”、“我的投稿”等页面。

- **后端：Cloudflare Workers（`workers/`）**
  - 使用 `itty-router` 构建 REST API。
  - 核心路由示例：
    - 认证与用户：
      - `POST /api/auth/register`：注册。
      - `POST /api/auth/login`：登录（返回 JWT，写入 `auth_token` HttpOnly Cookie）。
      - `POST /api/auth/logout`：退出登录。
      - `GET /api/auth/profile`、`PUT /api/auth/profile`：获取 / 更新个人资料。
    - 软件与下载：
      - `GET /api/software`：软件列表（支持关键字、分类、平台、分页）。
      - `GET /api/software/:slug`：软件详情（只返回已发布且未删除的软件）。
      - `POST /api/software/:slug/download`：记录下载并 302 跳转到网盘链接。
    - 用户投稿（可选增强）：
      - `POST /api/software/submit`：登录用户投稿软件。
      - `GET /api/user/submissions`：查看自己的投稿及审核状态。
    - 后台管理（需 `ADMIN_TOKEN` 或 `admin_tokens`）：
      - 软件管理：`GET/POST/PUT/DELETE /api/admin/software`。
      - 存储后端管理：`GET/POST /api/admin/storage-backends`。
      - 更新源管理：`GET/POST /api/admin/software/:id/sources`。
      - 投稿审核：`GET /api/admin/submissions`、`POST /api/admin/submissions/:id/review`。
  - 认证与安全：
    - 使用 **JWT** 存放用户标识，签名密钥由 `JWT_SECRET` 环境变量提供。
    - 前端主要通过 `HttpOnly` Cookie 携带 token。
    - 管理接口使用 `ADMIN_TOKEN` 或 `admin_tokens` 表进行鉴权。
  - 错误格式统一为 JSON，便于前端与日志分析。

- **数据库：Cloudflare D1（`db/schema.sql`）**
  - 核心实体：
    - `users`：用户账号。
    - `categories`：软件分类。
    - `software`：软件主信息（含上下架、软删除、投稿与审核字段）。
    - `software_categories`：软件与分类多对多关系。
    - `downloads`：下载日志（可选记录 `user_id`）。
    - `favorites`、`comments`：收藏与评论（未来可用）。
    - `admin_tokens`：后台 Token。
  - 扩展实体（架构级能力）：
    - `software_files`：一个软件多个物理文件/后端（主下载文件标记 `is_primary`）。
    - `storage_backends`：抽象各存储后端（如不同 OpenList 挂载、网盘账号）。
    - `software_sources`：软件版本更新源（GitHub/HTML 等），用于后续自动升级。
    - `software_submissions`：用户投稿记录，用于管理员审核。
  - 已为高频查询创建必要索引（email、slug、发布时间、下载统计等）。

- **数据库版本管理：Drizzle + D1 HTTP API（`workers/drizzle.config.ts`）**
  - 使用 `drizzle-orm` + `drizzle-kit` 为 D1 提供可版本化的 schema 定义与迁移：
    - TypeScript 版 schema：`workers/src/db/schema.ts`。
    - 迁移输出目录：`workers/drizzle/`。
  - 通过 D1 HTTP API 连接 Cloudflare：
    - 在本地或 CI 中配置环境变量：`CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_DATABASE_ID`、`CLOUDFLARE_D1_TOKEN`。
    - 常用命令（在 `workers/` 下）：
      - `npm run db:generate`：根据 TS schema 生成迁移。
      - `npm run db:push`：将当前 schema 推送到 D1。
      - `npm run db:studio`：打开 Drizzle Studio 浏览/调试数据库。

- **文件存储：OpenList + WebDAV + 各类网盘**
  - OpenList 部署在独立服务器或免费云机上，通过一键部署脚本 / 1Panel / Docker 完成。
  - 在 OpenList 中配置阿里云盘、OneDrive 等网盘，并开启 WebDAV。
  - 管理员通过 WebDAV 上传安装包，使用 OpenList 后台生成分享链接。
  - SoftCloud 数据库中仅存：
    - `openlist_share_url` / `share_url`：实际公开链接。
    - `openlist_file_path` / `file_path`：内部路径，便于维护。

---

## 目录结构

- **`db/`**
  - `schema.sql`：D1 全量建表与索引脚本。
  - `seed.sql`：开发用可选种子（当前为空，分类等通过后台维护）。

- **`workers/`**
  - `wrangler.toml`：Workers 配置（main 文件、D1 绑定、环境变量等）。
  - `package.json`：Workers 依赖与脚本。
  - `tsconfig.json`：TypeScript 配置。
  - `src/types.d.ts`：`Env` 类型定义。
  - `src/auth.ts`：密码哈希与 JWT 辅助。
  - `src/index.ts`：Workers 主入口，包含所有路由与业务逻辑（含“第一个注册用户自动为管理员”的规则）。
  - `src/db/schema.ts`：使用 Drizzle 定义的 D1 schema（与 `db/schema.sql` 一一对应，便于迁移与类型推导）。
  - `src/ambient.d.ts`：类型补充声明。

- **`frontend/`**
  - Nuxt 3 应用：
    - `nuxt.config.ts`、`tsconfig.json`、`package.json`。
    - `app.vue`：全局布局（导航栏、语言切换、主题切换等）。
    - `pages/index.vue`：首页 + 搜索。
    - `pages/software/index.vue`：软件列表页。
    - `pages/software/[slug].vue`：软件详情页 + 下载按钮。
    - `pages/auth/login.vue`、`pages/auth/register.vue`：登录 / 注册页面。

- **`docs/`**
  - `deploy-cloudflare.md`：Workers + D1 + Pages 部署说明。
  - `openlist-integration.md`：OpenList 一键部署与 WebDAV / 分享链接集成说明。
  - `ARCHITECTURE-TODO.md`：架构级扩展 TODO 清单与设计草案。

- **其它**
  - `dev-all.ps1`：在 Windows 上一键启动本地 Workers 与前端的脚本。

---

## 本地开发（Windows / PowerShell 示例）

### 1. 安装依赖

- 安装 **Node.js 18+（推荐 20）**，确保 `node` / `npm` 可用。
- 全局安装 Wrangler（也可使用 `npx` 临时调用）：

```powershell
npm install -g wrangler
```

### 2. 初始化 D1

1. 在 Cloudflare Dashboard 创建 D1 数据库（例如 `softcloud-db`）。
2. 在 D1 控制台执行 `db/schema.sql`，初始化表结构。
3. 记下 `Database ID`，填入 `workers/wrangler.toml` 中的 D1 绑定配置。

### 3. 配置 Workers 环境变量

在 `workers/wrangler.toml` 中设置开发用变量（生产环境建议在 Dashboard 上配置）：

```toml
[vars]
JWT_SECRET = "本地测试用的强随机字符串"
ADMIN_TOKEN = "本地测试用的后台管理 Token"
OPENLIST_BASE_URL = "https://your-openlist-domain.example.com"
```

### 4. 安装依赖并启动服务

```powershell
# Workers API
cd workers
npm install
npm run dev         # 默认 http://127.0.0.1:8787

# 前端（新终端）
cd ..\frontend
npm install
$env:NUXT_PUBLIC_API_BASE="http://127.0.0.1:8787"
npm run dev         # 默认 http://localhost:3000
```

也可以在 `frontend/.env` 中写入：

```env
NUXT_PUBLIC_API_BASE=http://127.0.0.1:8787
```

之后直接 `npm run dev` 即可。

### 5. 使用一键脚本

在仓库根目录：

```powershell
cd softcloud-archive
.\dev-all.ps1
```

脚本会分别启动 Workers 与前端，并自动设置前端的 `NUXT_PUBLIC_API_BASE`。

---

## OpenList 集成与下载流程（概览）

> 细节请参考 `docs/openlist-integration.md`。

1. **部署 OpenList**
   - 在免费云主机或面板（如 1Panel）上一键部署 OpenList。
   - 配置阿里云盘、OneDrive 等网盘驱动，并开启 WebDAV。
2. **上传软件 & 生成分享链接**
   - 管理员通过 WebDAV 或 Web 界面上传安装包到约定目录。
   - 使用 OpenList 后台为文件/目录生成公开分享链接。
3. **在 SoftCloud 中录入软件**
   - 调用 `/api/admin/software` 创建软件记录，填入：
     - 基本信息：`name`、`slug`、`version`、`short_desc` 等。
     - 存储信息：`openlist_file_path`、`openlist_share_url` 或通过 `software_files` 记录多个文件。
4. **用户下载流程**
   - 前端详情页调用 `/api/software/:slug/download`。
   - Workers 在 `downloads` 中记录一次下载（含 IP / UA / 可选用户 ID），然后 302 跳转至分享链接。

---

## 部署（Cloudflare 生产环境）

> 详细步骤见 `docs/deploy-cloudflare.md`。

- **Workers API**
  - 在 `workers` 目录运行 `npm run deploy`（或 `npx wrangler deploy`）。
  - 在 Cloudflare Dashboard 为 Workers 绑定 D1 与环境变量。
  - 可为 Workers 服务绑定二级域名（如 `api.softcloud.example.com`）。

- **前端（Cloudflare Pages）**
  - 创建 Pages 项目，根目录指向 `frontend/`。
  - 构建命令：`npm install && npm run build`。
  - 输出目录使用 Nuxt 静态导出目录（如 `.output/public`）。
  - 在 Pages 环境变量中设置：
    - `NUXT_PUBLIC_API_BASE=https://api.softcloud.example.com`

- **域名规划**
  - `softcloud.example.com` → Cloudflare Pages（前端）。
  - `api.softcloud.example.com` → Cloudflare Workers（后端 API）。
  - `pan.example.com` → OpenList 网盘站点。

---

## 架构级 TODO 总览

> 这里只列出方向性任务，详细说明请查看 `ARCHITECTURE-TODO.md`。

- **多存储后端与容量模型**
  - **目标**：支持多个网盘后端，后台可查看容量与占用情况。
  - **进度**：表结构与基础 API 已预留（`storage_backends`、`software_files`），后续补充容量统计与运维面板。

- **自动升级与爬虫能力**
  - **目标**：为 GitHub / HTML 官网配置更新源，定时检测新版本并自动更新软件记录。
  - **进度**：`software_sources` 与定时任务骨架已创建，待实现具体 GitHub / HTML 抽取逻辑与管理界面。

- **后台管理端增强**
  - **目标**：围绕软件生命周期提供更完整的后台视图（历史版本、存储后端、更新源、统计等）。
  - **进度**：相关表与 API 已有初步支撑，前端后台 UI 尚待实现。

- **统计与推荐**
  - **目标**：基于下载/评分数据实现热门榜单与推荐位。
  - **进度**：下载与评论数据已记录，尚未实现聚合统计与推荐算法。

- **多用户投稿 + 审核发布**
  - **目标**：用户可以投稿软件，管理员审核后上线。
  - **进度**：`software_submissions` 表、投稿与审核 API 已提供，前端投稿/审核界面待开发。

- **批量导入（扫描 OpenList 目录）**
  - **目标**：从指定 OpenList 目录批量导入安装包 + 元数据文件。
  - **进度**：在架构文档中给出了完整方案；首版可以先实现为脚本/内部工具，再视需求升级为正式功能。

---

SoftCloud Archive 目前已经具备最小可用的「软件下载站 + OpenList 存储 + Cloudflare 部署」能力，并在架构层为后续扩展预留了足够空间。你可以从本地开发跑通完整流程后，再按文档将其部署到 Cloudflare 和自己的 OpenList 环境中。+

