# OpenList 集成与使用说明

本项目不直接在 Cloudflare 上存储软件安装包，而是通过 **OpenList + 各类网盘 + WebDAV** 托管二进制文件，并通过分享链接对用户开放下载。

---

## 一、操作指南

### 1. 部署 OpenList

**推荐 [Railway](https://railway.com)**：一键部署、新用户 $5 试用且**无需绑卡**。注意：Railway 上的 [openlist-on-railway](https://railway.com/deploy/openlist) 为**社区模板**（[tianheg/openlist-on-railway](https://github.com/tianheg/openlist-on-railway)），基于 OpenList 镜像封装，并非 [OpenList 官方仓库](https://github.com/OpenListTeam/OpenList) 直接部署。若需原版 OpenList，请用方式 B（Render）或**方式 C（官方镜像/从源码）**。备选 [Render](https://render.com)（可能需绑卡）见方式 B。

#### 方式 A：一键部署到 Railway（社区模板，推荐）

1. 打开 [railway.com/deploy/openlist](https://railway.com/deploy/openlist)（或 README 中的「Deploy on Railway」按钮），部署的是社区模板 tianheg/openlist-on-railway。
2. 按提示登录 Railway（可用 GitHub），确认部署。
3. 部署完成后在 Railway 服务设置中为服务**生成公网域名**（Settings → Networking → Generate Domain），得到 OpenList 访问地址（如 `https://xxx.up.railway.app`）。
4. **首次登录**：Railway 的 OpenList 模板（openlist-on-railway）**不会**在 Build Logs 或 Deploy Logs 中输出密码。请直接浏览器访问上一步的 OpenList 地址，在打开的**首次设置向导**中创建管理员账号并设置密码即可。

#### 方式 B：部署到 Render（备选，可能需绑卡）

本仓库**根目录**已包含 `render.yaml`：

1. 打开：`https://render.com/deploy?repo=https://github.com/jackadam1981/softcloud-archive`，按提示登录并确认配置即可创建 OpenList 服务（镜像 `ghcr.io/lsc0223/openlist-for-paas:main`）。
2. 或手动：Render Dashboard → New → Web Service → 从镜像部署 → Image URL 填 `ghcr.io/lsc0223/openlist-for-paas:main`，端口 5244，挂载 Disk `/opt/openlist/data`（至少 1GB）。详见 [linux.do Render 教程](https://linux.do/t/topic/1031701)、[deploy/openlist-render/](../deploy/openlist-render/)。

#### 方式 C：官方镜像 / 从源码部署（原版 OpenList）

若希望使用 [OpenList 官方仓库](https://github.com/OpenListTeam/OpenList) 的镜像或从源码构建，可采用以下方式。

**官方 Docker 镜像**（[OpenList 官方文档](https://openlist.team/guide/installation/docker)）：

- 镜像：`openlistteam/openlist:latest` 或 `openlistteam/openlist:latest-lite`（生产建议用固定版本标签如 `openlistteam/openlist:v4.x.x`）。
- 自建服务器上可直接运行：
  ```bash
  docker run -d --name openlist --restart always \
    -p 5244:5244 \
    -v /data/openlist:/opt/openlist/data \
    openlistteam/openlist:latest
  ```
- 在 **Render** 上若要用官方镜像：New → Web Service → 从镜像部署 → Image URL 填 `docker.io/openlistteam/openlist:latest-lite`，端口 5244，挂载 Disk `/opt/openlist/data`。注意 v4.1.0+ 在部分 PaaS 上可能出现 data 目录权限问题，若遇此类错误可改用方式 B 中的 PaaS 镜像或自建 Docker。

**从源码构建与运行**：

- 官方提供 [一键脚本](https://openlist.team/guide/installation/script)、[手动安装](https://openlist.team/guide/installation/manual)、[从源码运行](https://openlist.team/guide/) 等说明。
- 从源码：克隆 [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList)，按仓库与 [官方文档](https://openlist.team/guide/) 的构建步骤编译并运行（或自行构建 Docker 镜像后按上段方式部署）。

其他方式：1Panel 一键部署、[OpenList 官方 PaaS 文档](https://doc.openlist.team/guide/installation/paas) 等亦可。

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
