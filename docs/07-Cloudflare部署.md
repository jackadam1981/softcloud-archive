# 在 Cloudflare 上部署 SoftCloud

> **前置条件**：完成 [05-01-环境与基础设施](./05-01-环境与基础设施.md) 的本地环境搭建（D1 创建、schema 初始化、Wrangler 配置、OpenList 部署）。

本项目由三部分组成：

- **Workers API**：`workers/` 目录，提供后端接口与 D1 访问。
- **D1 数据库**：`db/schema.sql` 定义表结构。
- **前端（Nuxt 3 + Vue）**：`frontend/` 目录，部署到 Cloudflare Pages。

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
4. 在 D1 控制台执行 `db/schema.sql` 内容：
   - 打开「控制台」或「查询」页面。
   - 复制 `db/schema.sql` 文件的 SQL 内容粘贴执行，完成表结构初始化。

> 如需后续迁移，可考虑使用 wrangler 的 migrations 功能，这里先用最简单方式起步。

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

## 7. GitHub Actions 一键部署

一次 `git push` 可同时触发：

| 组件 | 部署方式 |
|------|----------|
| **Workers** | 本仓库 `.github/workflows/deploy.yml` 在 Actions 中执行 `wrangler deploy` |
| **Pages** | Cloudflare Pages 连接本仓库后，push 自动构建并部署 `frontend/` |
| **OpenList** | 若 OpenList 部署在 Render 且连接其仓库，push 自动部署（见 [08-OpenList集成](./08-OpenList集成.md)） |

### 7.1 配置 Workers 自动部署

1. 在 GitHub 仓库 → Settings → Secrets and variables → Actions 中添加：
   - `CLOUDFLARE_API_TOKEN`：Cloudflare API Token（需包含 Workers 与 D1 的编辑权限）
2. 确保 `workers/wrangler.toml` 中 D1、环境变量已正确配置；敏感值（如 `JWT_SECRET`、`ADMIN_TOKEN`）建议在 Cloudflare Dashboard 的环境变量中设置，不放入代码仓库。
3. 推送到 `main` 或 `master` 后，Actions 自动执行 Workers 部署。

### 7.2 配置 Pages 与 OpenList

- **Pages**：在 Cloudflare Dashboard 创建 Pages 项目并连接本仓库，构建设置根目录为 `frontend`，每次 push 自动部署。
- **OpenList**：推荐用 [Render](https://render.com) 部署，连接 OpenList 所在仓库，push 自动重新部署。详见 [08-OpenList集成](./08-OpenList集成.md)。

如需多环境、灰度发布、自动迁移等扩展，可在此基础上继续细化 wrangler 与 CI/CD 配置。
