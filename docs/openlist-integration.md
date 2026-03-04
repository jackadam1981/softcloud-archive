## OpenList 集成与使用说明

本项目不直接在 Cloudflare 上存储软件安装包，而是通过 **OpenList + 各类网盘 + WebDAV** 来托管二进制文件，并通过分享链接对用户开放下载。

### 1. 部署 OpenList

- 任选一种方式在服务器或免费云空间上部署 OpenList（示例）：
  - 使用面板（如 1Panel）应用商店的一键部署。
  - 使用 Docker 镜像部署。
  - 使用官方脚本/手动安装。
- 部署完成后：
  - 为 OpenList 绑定域名，例如：`pan.example.com`。
  - 为管理账号设置强密码。

### 2. 挂载网盘与开启 WebDAV

1. 登录 OpenList 管理后台。
2. 添加存储：
   - 例如阿里云盘、OneDrive、天翼云盘、本地存储等。
   - 根据 OpenList 文档填写对应的 Token/授权信息。
3. 启用 WebDAV 功能：
   - 在 OpenList 配置中打开 WebDAV 开关。
   - 记下 WebDAV 地址，例如：`https://pan.example.com/dav/`。
   - 确保用于 WebDAV 的用户只授予必要权限（读/写），避免暴露管理账号。

### 3. 上传软件安装包

上传有两种典型方式：

- **方式 A：WebDAV 客户端**
  - 使用 RaiDrive、Mountain Duck、Rclone 等工具，将 WebDAV 映射为本地盘。
  - 把安装包（`.exe`、`.msi`、`.zip` 等）复制到指定目录，例如：`/soft/windows/office/xxx.exe`。

- **方式 B：OpenList Web 页面**
  - 直接在 OpenList 文件管理界面上传到目标目录。

目录组织建议：

- `soft/windows/`、`soft/mac/`、`soft/linux/` 按平台分目录。
- 每个软件一个子目录，里面存放不同版本的安装包。

### 4. 生成软件分享链接

1. 在 OpenList 中找到刚上传的软件文件或目录。
2. 使用 OpenList 提供的「分享」功能：
   - 生成一个可公开访问的链接，例如：
     - `https://pan.example.com/s/abc123`（短链）
     - 或者直接的下载直链。
3. 复制该链接，准备录入到 SoftCloud。

### 5. 在 SoftCloud 中录入软件信息

SoftCloud 的后端 Workers 提供了管理员 API，用于把 OpenList 的文件信息与软件元数据关联起来。

- 管理员 API 使用一个 `ADMIN_TOKEN` 进行保护：
  - 在 `workers/wrangler.toml` 或 Cloudflare Dashboard 的环境变量中配置：
    - `ADMIN_TOKEN=你的强随机字符串`
  - 调用后台接口时，通过 HTTP 头部携带：
    - `Authorization: Bearer YOUR_ADMIN_TOKEN`

#### 5.1 新增软件（POST /api/admin/software）

示例请求：

```bash
curl -X POST "https://api.softcloud.example.com/api/admin/software" ^
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{
    \"name\": \"示例软件\",
    \"slug\": \"demo-soft\",
    \"version\": \"1.0.0\",
    \"short_desc\": \"一个示例软件\",
    \"long_desc\": \"详细介绍...\\n支持 Windows 平台。\",
    \"homepage\": \"https://demo.example.com\",
    \"license\": \"Freeware\",
    \"platforms\": \"[\\\"Windows\\\"]\",
    \"icon_url\": null,
    \"openlist_share_url\": \"https://pan.example.com/s/abc123\",
    \"openlist_file_path\": \"/soft/windows/demo/demo-1.0.0.exe\"
  }"
```

关键字段说明：

- **`openlist_share_url`**：用户实际访问的网盘分享链接。
- **`openlist_file_path`**：OpenList 中的文件路径，方便你后续升级/维护。

#### 5.2 更新软件（PUT /api/admin/software/:id）

- 当你在 OpenList 中替换版本或变更路径时：
  - 重新生成新版本的分享链接。
  - 调用 `PUT /api/admin/software/:id` 接口，更新对应软件的 `version`、`openlist_share_url`、`openlist_file_path` 等字段。

### 6. 用户下载流程与统计

前端使用的是 `/api/software/:slug/download` 作为中转：

1. 用户打开某软件详情页（例如 `/software/demo-soft`）。
2. 点击「立即下载」按钮：
   - 前端跳转到：`https://api.softcloud.example.com/api/software/demo-soft/download`。
3. Workers 后端逻辑：
   - 根据 `slug` 从 D1 中查出对应软件记录。
   - 在 `downloads` 表中插入一条下载日志（包含软件 ID、IP、UA 等）。
   - 如果存在 `openlist_share_url`，返回 302 重定向到该链接。
4. 用户浏览器自动跳转到 OpenList 分享链接，从实际网盘拉取文件。

这样做的好处：

- 所有下载都会被 SoftCloud 记录，便于统计热门软件、近期下载等。
- 可以在不改变用户体验的前提下自由更换网盘或调整文件路径，只需更新数据库里的链接。

