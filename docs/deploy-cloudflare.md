## 在 Cloudflare 上部署 SoftCloud

本项目由三部分组成：

- **Workers API**：`workers/` 目录，提供后端接口与 D1 访问。
- **D1 数据库**：`db/schema.sql` 定义表结构。
- **前端（Nuxt 3 + Vue）**：`frontend/` 目录，将部署到 Cloudflare Pages。

下面是推荐的部署步骤。

---

### 1. 准备代码与 Cloudflare 账号

1. 确保本仓库已推到一个 Git 仓库（GitHub/GitLab/Bitbucket 均可）。
2. 准备一个 Cloudflare 账号，并完成域名接入（可用二级域名）。

---

### 2. 创建 D1 数据库

1. 登录 Cloudflare Dashboard。
2. 左侧导航选择 **D1**，点击「创建数据库」：
   - 数据库名称示例：`softcloud-db`。
3. 创建完成后，进入数据库详情页：
   - 记下 **Database ID**，稍后需要配置到 `wrangler.toml` 中。

4. 在 D1 控制台执行 `db/schema.sql` 内容：
   - 打开「控制台」或「查询」页面。
   - 复制 `db/schema.sql` 文件的 SQL 内容粘贴执行，完成表结构初始化。

> 如需后续迁移，可考虑把 `schema.sql` 拆成多版迁移脚本，并使用 wrangler 的 migrations 功能，这里先用最简单的方式起步。

---

### 3. 配置并部署 Workers API

#### 3.1 本地安装依赖

```bash
cd workers
npm install
```

#### 3.2 配置 `wrangler.toml`

编辑 `workers/wrangler.toml`：

- 将 D1 绑定信息中的 `database_id` 替换为真实的 D1 数据库 ID：

```toml
[[d1_databases]]
binding = "DB"
database_name = "softcloud-db"
database_id = "你的 D1 Database ID"
```

- 设置环境变量（建议在 Cloudflare Dashboard 中配置，而不是写死在文件里）：
  - `JWT_SECRET`：强随机字符串，用于 JWT 签名。
  - `ADMIN_TOKEN`：后台 API 的管理 Token。
  - `OPENLIST_BASE_URL`：OpenList 的基础访问地址，例如 `https://pan.example.com`。

你可以选择：

- 本地 `wrangler.toml` 中保留占位，真正的值在 Dashboard 的「Workers」→「设置」→「环境变量」中配置。

#### 3.3 本地调试

```bash
cd workers
npx wrangler dev
```

默认会在 `http://localhost:8787` 暴露 API，方便前端联调（`frontend` 的 `NUXT_PUBLIC_API_BASE` 默认也是这个地址）。

#### 3.4 部署到 Cloudflare Workers

```bash
cd workers
npx wrangler deploy
```

部署完成后，控制台会输出一个 Workers 的访问地址，例如：

- `https://softcloud-api.your-subdomain.workers.dev`

你可以在 Dashboard 中为其绑定一个自定义域名，例如：

- `api.softcloud.example.com`

---

### 4. 部署 Nuxt 3 前端到 Cloudflare Pages

#### 4.1 在 Cloudflare Pages 创建项目

1. 登录 Cloudflare Dashboard → **Pages**。
2. 点击「创建项目」，选择你的 Git 仓库。
3. 在构建设置中：
   - **项目根目录**：`frontend`
   - **构建命令**：`npm install && npm run build`
   - **构建输出目录**：
     - 对于 `nuxt generate`，输出目录可以设置为 `.output/public`（或根据 Nuxt 版本选择 `dist`，请与实际生成结果保持一致）。

#### 4.2 配置环境变量

在 Pages 项目设置中，添加环境变量：

- `NUXT_PUBLIC_API_BASE=https://api.softcloud.example.com`

这样 Nuxt 前端在运行时就会通过该地址调用 Workers API。

#### 4.3 触发构建并访问

- 保存设置后，Cloudflare Pages 会自动触发构建并部署。
- 部署完成后，你会得到一个 Pages 域名，例如：
  - `https://softcloud.pages.dev`
- 也可以为 Pages 项目绑定自定义域名，例如：
  - `softcloud.example.com`

---

### 5. 域名与整体访问路径

推荐域名布局：

- `softcloud.example.com` → Cloudflare Pages（Nuxt 前端）。
- `api.softcloud.example.com` → Cloudflare Workers（后端 API）。
- `pan.example.com` → OpenList 网盘站点。

前端调用：

- API 基础地址：`https://api.softcloud.example.com`
- 示例：
  - 获取软件列表：`GET https://api.softcloud.example.com/api/software`
  - 软件详情：`GET https://api.softcloud.example.com/api/software/:slug`
  - 下载中转：`POST https://api.softcloud.example.com/api/software/:slug/download`

---

### 6. 首次上线后的验证清单

部署完成后，建议依次验证：

1. **前端可访问**：打开 `softcloud.example.com` 能看到首页。
2. **软件列表接口**：前端首页能正常列出软件（如暂为空，可先用管理员 API 录入 1~2 个测试软件）。
3. **下载流程**：
   - 打开某软件详情页，点击「立即下载」。
   - 浏览器是否正确跳转到 OpenList 的分享链接页面。
4. **D1 记录**：
   - 通过 D1 控制台查询 `downloads` 表，是否新增了下载记录。
5. **注册/登录**（可选）：
   - 测试 `/auth/register` 和 `/auth/login` 页面与对应 Workers 接口联通。

如需进一步扩展（多环境部署、灰度发布、自动迁移等），可以在此基础上继续细化 wrangler 配置与 CI/CD 流程。+

