# 在 Cloudflare 上部署 SoftCloud

> **前置条件**：完成 [05-01-环境与基础设施](./05-01-环境与基础设施.md) 的本地环境搭建（D1 创建、schema 初始化、Wrangler 配置、OpenList 部署）。

本项目由三部分组成：

- **Workers API**：`workers/` 目录，提供后端接口与 D1 访问。
- **D1 数据库**：使用 Drizzle ORM，`workers/src/db/schema.ts` 定义表结构；`npm run db:push` 可推送至 D1 自动建表。
- **前端（Nuxt 3 + Vue）**：`frontend/` 目录，部署到 Cloudflare Pages。

---

## 0. 首次手动部署流程（总览）

在启用 GitHub Actions 一键部署之前，需先完成一次手动部署，创建好各资源并打通整条链路。按下列顺序执行即可。

| 步骤 | 动作 | 详见 |
|------|------|------|
| 1 | 准备代码与 Cloudflare 账号 | §1 |
| 2 | 创建 D1 数据库，初始化表结构（`db:push` 或执行 `db/schema.sql`） | §2 |
| 3 | 配置 `workers/wrangler.toml`（D1 database_id、环境变量），在 Cloudflare Dashboard 为 Workers 配置 `JWT_SECRET`、`ADMIN_TOKEN`、`OPENLIST_BASE_URL` | §3 |
| 4 | 首次部署 Workers：`cd workers && npx wrangler deploy` | §3.4 |
| 5 | 在 Cloudflare Dashboard 创建 Pages 项目，连接本仓库，根目录设为 `frontend`，配置 `NUXT_PUBLIC_API_BASE` 为 Workers 地址，触发首次构建 | §4 |
| 6 | 若 OpenList 尚未部署，按 [08-OpenList集成](./08-OpenList集成.md) 在 Render 等平台部署 | §5、08 |
| 7 | 按「首次上线验证清单」逐项验证 | §6 |
| 8 | 在 GitHub 仓库配置 `CLOUDFLARE_API_TOKEN`，此后 push 由 Actions 自动部署 Workers；Pages、OpenList 已连 Git 的则随 push 自动部署 | §7 |

完成上述步骤后，日常迭代只需 `git push`，Workers 由 Actions 部署，Pages/OpenList 由各自平台监听 Git 自动部署。

---

## 1. 准备代码与 Cloudflare 账号

1. 确保本仓库已推到一个 Git 仓库（GitHub/GitLab/Bitbucket 均可）。
2. 准备一个 Cloudflare 账号，并完成域名接入（可用二级域名）。

---

## 2. 创建 D1 数据库

1. 登录 Cloudflare Dashboard。
2. 左侧导航选择 **D1**，点击「创建数据库」：
   - 数据库名称示例：`softcloud-db`。
3. 创建完成后，进入数据库详情页：
   - 记下 **Database ID**，稍后需配置到 `wrangler.toml` 中。
4. 初始化表结构（任选其一）：
   - **推荐**：在 `workers/` 目录下配置 `drizzle.config.ts` 的 D1 凭据后，执行 `npm run db:push`，Drizzle 会根据 `workers/src/db/schema.ts` 自动创建/更新表。
   - **备选**：在 D1 控制台「查询」页面，复制 `db/schema.sql` 内容粘贴执行。

> 表结构源为 `workers/src/db/schema.ts`，`db/schema.sql` 与其对应，供手动执行或迁移场景使用。

---

## 3. 配置并部署 Workers API

### 3.1 本地安装依赖

```bash
cd workers
npm install
```

### 3.2 配置 wrangler.toml

编辑 `workers/wrangler.toml`：

- 将 D1 绑定中的 `database_id` 替换为真实的 D1 Database ID：

```toml
[[d1_databases]]
binding = "DB"
database_name = "softcloud-db"
database_id = "你的 D1 Database ID"
```

- 设置环境变量（建议在 Cloudflare Dashboard 中配置）：
  - `JWT_SECRET`：强随机字符串，用于 JWT 签名。
  - `ADMIN_TOKEN`：后台 API 管理 Token。
  - `OPENLIST_BASE_URL`：OpenList 访问地址，例如 `https://pan.example.com`。

### 3.3 本地调试

```bash
cd workers
npx wrangler dev
```

默认在 `http://localhost:8787` 暴露 API。

### 3.4 部署到 Cloudflare Workers

```bash
cd workers
npx wrangler deploy
```

部署完成后会输出 Workers 地址，可在 Dashboard 中绑定自定义域名（如 `api.softcloud.example.com`）。

---

## 4. 部署 Nuxt 3 前端到 Cloudflare Pages

### 4.1 创建 Pages 项目

1. Cloudflare Dashboard → **Pages** → 创建项目，选择 Git 仓库。
2. 构建设置：
   - **项目根目录**：`frontend`
   - **构建命令**：`npm install && npm run build`
   - **构建输出目录**：`.output/public`（或根据 Nuxt 版本选择 `dist`）

### 4.2 配置环境变量

在 Pages 项目设置中添加：

- `NUXT_PUBLIC_API_BASE=https://api.softcloud.example.com`

### 4.3 触发构建并访问

保存后 Pages 会自动构建部署，得到如 `https://softcloud.pages.dev` 的域名，也可绑定自定义域名（如 `softcloud.example.com`）。

---

## 5. 域名与整体访问路径

推荐布局：

- `softcloud.example.com` → Cloudflare Pages（前端）
- `api.softcloud.example.com` → Cloudflare Workers（后端 API）
- `pan.example.com` → OpenList 网盘站点

API 示例：

- 软件列表：`GET https://api.softcloud.example.com/api/software`
- 软件详情：`GET https://api.softcloud.example.com/api/software/:slug`
- 下载中转：`POST https://api.softcloud.example.com/api/software/:slug/download`

---

## 6. 首次上线验证清单

1. **前端可访问**：打开 `softcloud.example.com` 能看到首页。
2. **软件列表接口**：首页能正常列出软件（可先用管理员 API 录入测试数据）。
3. **下载流程**：点击「立即下载」是否 302 跳转至网盘分享链接。
4. **D1 记录**：在 D1 控制台查询 `downloads` 表，确认有下载记录。
5. **注册/登录**：测试 `/auth/register` 和 `/auth/login`。

---

## 7. 一键部署按钮（Deploy to Cloudflare）

若只想快速体验 **Workers API + D1**，可使用 Cloudflare 官方一键部署按钮（无需本地安装 Wrangler、无需 GitHub Actions）：

- 在项目 README 中点击 **[Deploy to Cloudflare](https://deploy.workers.cloudflare.com/?url=https://github.com/jackadam1981/softcloud-archive/tree/main/workers)** 按钮。
- 按提示登录 Cloudflare、选择或创建项目，Cloudflare 会克隆本仓库的 `workers/` 目录并自动创建 D1、绑定到 Worker。
- 部署完成后，在 Cloudflare Dashboard → 该 Worker → 设置 → 变量与密钥中配置：`JWT_SECRET`、`ADMIN_TOKEN`、`OPENLIST_BASE_URL`（否则登录与下载跳转不可用）。
- 该按钮**仅部署 Workers + D1**，前端（Pages）和 OpenList 仍需按 §4、§5 与 [08-OpenList集成](./08-OpenList集成.md) 单独部署。

> 若你 Fork 了本仓库，请将 README 中按钮链接的 `github.com/.../softcloud-archive` 改为你的仓库地址。

---

## 8. GitHub Actions 自动部署

一次 `git push` 可同时触发：

| 组件 | 部署方式 |
|------|----------|
| **Workers** | 本仓库 `.github/workflows/deploy.yml` 在 Actions 中执行 `wrangler deploy` |
| **Pages** | Cloudflare Pages 连接本仓库后，push 自动构建并部署 `frontend/` |
| **OpenList** | 若 OpenList 部署在 Render 且连接其仓库，push 自动部署（见 [08-OpenList集成](./08-OpenList集成.md)） |

### 8.1 配置 Workers 自动部署

1. 在 GitHub 仓库 → Settings → Secrets and variables → Actions 中添加：
   - `CLOUDFLARE_API_TOKEN`：Cloudflare API Token（需包含 Workers 与 D1 的编辑权限）
2. 确保 `workers/wrangler.toml` 中 D1、环境变量已正确配置；敏感值（如 `JWT_SECRET`、`ADMIN_TOKEN`）建议在 Cloudflare Dashboard 的环境变量中设置，不放入代码仓库。
3. 推送到 `main` 或 `master` 后，Actions 自动执行 Workers 部署。

### 8.2 配置 Pages 与 OpenList

- **Pages**：在 Cloudflare Dashboard 创建 Pages 项目并连接本仓库，构建设置根目录为 `frontend`，每次 push 自动部署。
- **OpenList**：推荐用 [Render](https://render.com) 部署，连接 OpenList 所在仓库，push 自动重新部署。详见 [08-OpenList集成](./08-OpenList集成.md)。

如需多环境、灰度发布、自动迁移等扩展，可在此基础上继续细化 wrangler 与 CI/CD 配置。
