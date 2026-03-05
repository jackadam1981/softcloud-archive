# OpenList 集成与使用说明

本项目不直接在 Cloudflare 上存储软件安装包，而是通过 **OpenList + 各类网盘 + WebDAV** 托管二进制文件，并通过分享链接对用户开放下载。

---

## 一、操作指南

### 1. 部署 OpenList

推荐用 [Render](https://render.com) 免费容器部署。

**说明**：OpenList 官方仓库 [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList) 未包含 `render.yaml`，直接点「Deploy to Render」并指向该仓库时不会自动建服务，需在控制台选「从镜像部署」或使用下方模板。完整步骤与版本差异见 [linux.do：render部署最新版openlist教程](https://linux.do/t/topic/1031701)。

**版本与镜像**：OpenList **v4.1.0 及以后**在 Render 上使用官方镜像时，可能出现「当前用户没有 /opt/openlist/data 的写和/或执行权限」。教程评论区推荐使用 PaaS 友好镜像 **`ghcr.io/lsc0223/openlist-for-paas:main`**，本模板已采用该镜像。v4.1.0 以前可用官方镜像并配置 `DB_*`、`UMASK=022` 等环境变量；v4.1.0+ 已移除 `PUID`/`PGID`，无需再设。

#### 方式 A：一键部署（直接使用本仓库）

本仓库**根目录**已包含 `render.yaml`，无需复制到新仓库：

1. 打开：`https://render.com/deploy?repo=https://github.com/jackadam1981/softcloud-archive`（或从 README 点击 Deploy to Render 按钮）。
2. 按提示登录 Render 并确认配置，即可创建 OpenList 服务（镜像 `ghcr.io/lsc0223/openlist-for-paas:main`）。

模板文件与说明见 [deploy/openlist-render/](../deploy/openlist-render/)。

#### 方式 B：在 Render 控制台手动部署

1. 登录 [Render Dashboard](https://dashboard.render.com/) → **New** → **Web Service**。
2. 选择 **Deploy an existing image from a registry**（从镜像部署）。
3. **Image URL** 填：`ghcr.io/lsc0223/openlist-for-paas:main`（推荐，避免 v4.1.0+ 权限问题）；或 `openlistteam/openlist:latest-lite`（v4.1.0+ 在 Render 上可能需自建镜像，见 [教程](https://linux.do/t/topic/1031701)）。
4. **Instance Type** 选 Starter（免费档约 15 分钟无请求后休眠）。
5. 添加 **Disk**：Mount Path 填 `/opt/openlist/data`，容量至少 1GB，用于持久化数据。
6. **环境变量**：Render 会注入 `PORT`；若使用外置 Postgres/MySQL，按 [教程](https://linux.do/t/topic/1031701) 设置 `DB_TYPE`、`DB_HOST`、`DB_NAME`、`DB_USER`、`DB_PASS`、`DB_PORT`、`DB_SSL_MODE`、`DB_TABLE_PREFIX`、`UMASK=022`。
7. 创建后访问 `https://你的服务名.onrender.com`，按首次向导设置管理员密码、挂载网盘等。
8. 可选：绑定自定义域名（如 `pan.example.com`），在 Render 服务设置中添加 Custom Domain。

其他方式：1Panel 一键部署、Docker 自建、[OpenList 官方 PaaS 文档](https://doc.openlist.team/guide/installation/paas) 等亦可。

### 2. 挂载网盘与开启 WebDAV

1. 登录 OpenList 管理后台。
2. 添加存储：阿里云盘、OneDrive、天翼云盘、本地存储等。
3. 启用 WebDAV：
   - 在配置中打开 WebDAV 开关。
   - 记下地址，如 `https://pan.example.com/dav/`。
   - WebDAV 用户仅授予必要读写权限。

### 3. 上传软件安装包

- **方式 A**：RaiDrive、Mountain Duck、Rclone 等映射 WebDAV，复制安装包到指定目录。
- **方式 B**：在 OpenList Web 界面上传。

目录建议：`soft/windows/`、`soft/mac/`、`soft/linux/` 按平台分目录；每个软件一个子目录存放不同版本。

### 4. 生成软件分享链接

1. 在 OpenList 中找到上传的软件文件或目录。
2. 使用「分享」功能生成可公开访问链接（如 `https://pan.example.com/s/abc123`）。
3. 复制链接，用于 SoftCloud 录入。

### 5. 在 SoftCloud 中录入软件

管理员 API 使用 `ADMIN_TOKEN` 保护，在 `workers/wrangler.toml` 或 Dashboard 环境变量中配置，调用时携带：

```
Authorization: Bearer YOUR_ADMIN_TOKEN
```

#### 新增软件（POST /api/admin/software）

```bash
curl -X POST "https://api.softcloud.example.com/api/admin/software" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"示例软件\",
    \"slug\": \"demo-soft\",
    \"version\": \"1.0.0\",
    \"short_desc\": \"一个示例软件\",
    \"long_desc\": \"详细介绍...\",
    \"homepage\": \"https://demo.example.com\",
    \"license\": \"Freeware\",
    \"platforms\": \"[\\\"Windows\\\"]\",
    \"icon_url\": null
    \"openlist_share_url\": \"https://pan.example.com/s/abc123\",
    \"openlist_file_path\": \"/soft/windows/demo/demo-1.0.0.exe\"
  }"
```

- **openlist_share_url**：用户实际访问的网盘分享链接。
- **openlist_file_path**：OpenList 内部路径，便于升级维护。
- **icon_url**：可填图片仓库 CDN URL，见 [03 图片存储约定](./03-架构与开发顺序.md#6-图片存储约定)。

#### 更新软件（PUT /api/admin/software/:id）

替换版本或变更路径时，重新生成分享链接并调用 `PUT` 更新 `version`、`openlist_share_url`、`openlist_file_path`。

### 6. 用户下载流程与统计

1. 用户打开软件详情页（如 `/software/demo-soft`）。
2. 点击「立即下载」→ 前端跳转到 `POST /api/software/:slug/download`。
3. Workers：查软件、写 `downloads` 日志、取 `openlist_share_url` 或 `software_files` 主文件。
4. 有链接 → 302 重定向至网盘分享链接；无链接 → 400 `DOWNLOAD_URL_MISSING`。
5. 用户浏览器直接从网盘拉取文件（无需连接 OpenList）。

**好处**：下载可统计；更换网盘或路径时只需更新数据库，前端无感知。

---

## 二、架构约定

### 职责边界

| 组件 | 职责 |
|------|------|
| **OpenList** | 网盘聚合、WebDAV 上传、分享链接生成、文件存储与访问 |
| **SoftCloud Workers** | 存 `openlist_share_url`、`openlist_file_path`，下载时 302 跳转 |
| **SoftCloud 前端** | 不直连 OpenList，只调 Workers API |

### 路径与目录约定

- 根路径：按存储后端区分，如 `/aliyun-main/`、`/onedrive-free/`。
- 软件目录：`soft/windows/`、`soft/mac/`、`soft/linux/`。
- 批量导入：约定导入目录前缀（如 `/aliyun-main/import/`），避免误扫。

### 需 OpenList 提供或约定的能力

| 能力 | 用途 | 当前状态 |
|------|------|----------|
| WebDAV 列出目录 | 批量导入扫描文件与 `.txt` 元数据 | 依赖 OpenList 是否暴露 |
| WebDAV 读取文件 | 解析 `.txt` 元数据 | 同上 |
| 分享链接生成 | 用户下载入口 | 已有 |
| 容量/配额信息 | 存储后端面板展示 | 待 OpenList 提供或约定 |

### 预留演进

- **自动升级**：新版本检测后，将文件上传至 OpenList，再更新 `software_files` 与 `openlist_share_url`。
- **批量导入**：脚本/Worker 调用 WebDAV PROPFIND 等列出目录，读取 `.txt` 后调用 `POST /api/admin/software` 入库。

---

## 三、相关文档

- [05-05-存储后端与OpenList](./05-05-存储后端与OpenList.md)
- [04-API合约](./04-API合约.md)
