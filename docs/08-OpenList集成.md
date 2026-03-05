# OpenList 集成与使用说明

本项目不直接在 Cloudflare 上存储软件安装包，而是通过 **OpenList + 各类网盘 + WebDAV** 托管二进制文件，并通过分享链接对用户开放下载。

---

## 一、操作指南

### 1. 部署 OpenList

推荐用 [Render](https://render.com) 免费容器部署。

**一键部署到 Render**（使用 [OpenList 官方仓库](https://github.com/OpenListTeam/OpenList)）：

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/OpenListTeam/OpenList)

点击按钮后按提示登录 Render、确认或填写服务配置即可创建 OpenList 实例。若 OpenList 仓库提供 `render.yaml`，Render 会按配置创建服务；否则在 Render 控制台选择「Web Service」并连接该仓库，选择 Docker 或对应运行方式即可。

**手动步骤**（与按钮等效）：

1. 将 OpenList 项目推到 Git 仓库（或 Fork [OpenListTeam/OpenList](https://github.com/OpenListTeam/OpenList)）。
2. Render 创建 Web Service，连接该仓库，选择 Docker 或对应运行方式。
3. 绑定自定义域名（如 `pan.example.com`），为管理账号设置强密码。
4. 连接 GitHub 后，每次 push 自动重新部署。

其他方式：1Panel 一键部署、Docker 自建、官方脚本/手动安装亦可。

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
