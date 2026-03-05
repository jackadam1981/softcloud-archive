# SoftCloud Archive

一个类似 **华军软件园** 的云端软件下载站，帮你把软件放到网盘里，用户通过你的站点就能浏览和下载。

---

## 它能做什么？

- **访客**：按分类、平台、关键词搜索软件，看详情，点下载跳到网盘，浏览热门榜单与推荐
- **注册用户**：注册登录、改资料、投稿软件、查看我的投稿及审核状态
- **管理员**：软件管理、多网盘后端与容量统计、审核用户投稿、更新源配置（GitHub/官网自动检测新版本）、热门榜单与推荐、批量导入

软件安装包都放在网盘（阿里云盘、OneDrive 等），你的 Cloudflare 只存「元数据」和提供下载跳转，不占 Cloudflare 流量。

---

## 用到了什么技术？

- **前端**：Nuxt 3 + Vue 3，部署在 Cloudflare Pages，支持中英文和深浅色主题
- **后端**：Cloudflare Workers + D1 数据库，提供 REST API
- **存储**：用 [OpenList](https://github.com/OpenListTeam/OpenList) 挂载网盘，通过 WebDAV 上传文件，用分享链接给用户下载。OpenList 仅在上传文件和生成分享链接时需要运行，可 [一键部署到 Railway](https://railway.com/deploy/openlist)（无需绑卡）

---

## 一键部署

建议顺序：**① 先部署 OpenList（网盘）→ ② 再部署 Cloudflare（API + 前端）**，以便将 OpenList 地址填入 Workers 的 `OPENLIST_BASE_URL`。

### ① 部署 OpenList（网盘）

**推荐 Railway**：一键部署、新用户 $5 试用且**无需绑卡**，比 Render 省事。

- **一键部署（Railway）**：点击下方按钮，或访问 [railway.com/deploy/openlist](https://railway.com/deploy/openlist)，按提示登录即可创建 OpenList。部署后在 Railway 日志中查看初始管理员密码。
- **备选 Render**：若使用 Render，本仓库根目录含 [render.yaml](render.yaml)，访问 `https://render.com/deploy?repo=https://github.com/jackadam1981/softcloud-archive` 即可（Render 可能需绑卡）。详见 [08-OpenList集成](docs/08-OpenList集成.md)。

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/openlist)

部署完成后记下 OpenList 地址，供下一步配置 Workers 的 `OPENLIST_BASE_URL`。

### ② 部署到 Cloudflare（Workers API + D1）

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jackadam1981/softcloud-archive/tree/main/workers)

点击后按提示登录 Cloudflare 即可部署 **Workers API + D1**。部署完成后在 Dashboard 中配置：`JWT_SECRET`、`ADMIN_TOKEN`、`OPENLIST_BASE_URL`（填上一步的 OpenList 地址）。前端（Pages）需另行部署，见 [07-Cloudflare部署](docs/07-Cloudflare部署.md)。

---

## 文档导航

想深入了解或动手开发？建议按阅读顺序：

| 顺序 | 文档 | 适合谁看 | 内容 |
|------|------|----------|------|
| 1 | [01-软件功能简介](docs/01-软件功能简介.md) | 所有人 | 功能概览、目标用户 |
| 2 | [02-软件需求设计分析书](docs/02-软件需求设计分析书.md) | 产品/开发 | 需求与设计 |
| 3 | [03-架构与开发顺序](docs/03-架构与开发顺序.md) | 开发 | 架构图、分层、开发顺序 |
| 4 | [04-API合约](docs/04-API合约.md) | 后端 | API 路径、请求/响应、错误码（实施前先读） |
| 5 | [05-01～05-07](docs/05-01-环境与基础设施.md) | 开发 | 按阶段的任务清单 |
| 6 | [06-架构待办与路线图](docs/06-架构待办与路线图.md) | 开发 | 功能优先级、待办事项 |
| 7 | [07-Cloudflare部署](docs/07-Cloudflare部署.md) | 运维 | 生产部署与 GitHub Actions 一键部署 |
| 8 | [08-OpenList集成](docs/08-OpenList集成.md) | 运维/管理员 | OpenList 部署（Render）、上传、分享链接 |

---

## 怎么在本地跑起来？

### 1. 装好 Node.js 和 Wrangler

需要 Node.js 18 以上（建议 20），再装个 Wrangler：

```powershell
npm install -g wrangler
```

### 2. 准备 D1 数据库

去 Cloudflare 控制台创建一个 D1 数据库（比如叫 `softcloud-db`），拿到 Database ID 备用。表结构用 Drizzle 推送：`cd workers && npm run db:push`（需先配好 `drizzle.config.ts` 中的 D1 凭据）；或手动执行 `db/schema.sql`。

### 3. 配好 Workers

编辑 `workers/wrangler.toml`，填上 Database ID，再配三个变量：

- `JWT_SECRET`：随便一长串随机字符，用来签用户 token
- `ADMIN_TOKEN`：管理员用的 Token，后台接口靠它鉴权
- `OPENLIST_BASE_URL`：你的 OpenList 网盘地址

### 4. 启动后端和前端

```powershell
# 先起 Workers
cd workers
npm install
npm run dev          # 默认跑在 http://127.0.0.1:8787

# 再起前端（新开一个终端）
cd ..\frontend
npm install
$env:NUXT_PUBLIC_API_BASE="http://127.0.0.1:8787"
npm run dev          # 默认跑在 http://localhost:3000
```

或者用根目录的 `dev-all.ps1` 一键启动（Windows PowerShell）。

---

## 怎么部署到线上？

- **点按钮部署（推荐试玩）**：见上方「一键部署到 Cloudflare」按钮，仅部署 Workers + D1；Pages、OpenList 需另配。
- **完整部署**：详细步骤在 [07-Cloudflare部署](docs/07-Cloudflare部署.md)。

**手动部署**：Workers 用 `cd workers && npx wrangler deploy`，前端在 Cloudflare Pages 新建项目（根目录 `frontend`），OpenList 推荐用 Render 部署。

**Git 自动部署**：配置好 [GitHub Actions](.github/workflows/deploy.yml)（需 `CLOUDFLARE_API_TOKEN` 密钥）后，push 到 `main`/`master` 自动部署 Workers；Pages 和 Render 上的 OpenList 连接仓库后也会随 push 自动部署。

---

## 软件怎么存到网盘？

1. 部署好 OpenList（1Panel、Docker 都行），挂上阿里云盘/OneDrive 等
2. 开 WebDAV，用 RaiDrive、Rclone 等把文件传到约定目录
3. 在 OpenList 里给文件生成分享链接
4. 调 `POST /api/admin/software` 把软件信息和分享链接录入 SoftCloud

具体操作见 [08-OpenList集成](docs/08-OpenList集成.md)。

---

## 项目结构（大概）

```
softcloud-archive/
├── .github/       # GitHub Actions（workflows/deploy.yml 一键部署 Workers）
├── db/            # 数据库建表脚本
├── workers/       # Cloudflare Workers 后端（REST API：软件、用户、下载、存储后端、更新源、统计）
├── frontend/      # Nuxt 3 前端
│   ├── 前台         # 首页、软件列表、详情、搜索、热门榜单
│   ├── 用户后台     # 我的投稿、个人资料
│   └── 管理员后台   # 软件管理、存储后端、投稿审核、更新源、批量导入
├── docs/          # 文档
└── dev-all.ps1    # 本地一键启动脚本（Windows）
```

实现进度见 [06-架构待办与路线图](docs/06-架构待办与路线图.md)。

---

SoftCloud Archive 已经能跑起来一个可用的「软件站 + 网盘存储 + Cloudflare 部署」了。先在本地把流程打通，再按文档部署到线上即可。
