## SoftCloud 架构级待办清单（Architecture TODO）

本文件记录 SoftCloud Archive 在「架构层面」需要逐步落地的事项，方便后续分别由前端 / Workers API / 数据库 / OpenList 讨论与实现。

---

### 1. 多存储后端 + 容量/配额模型

**目标**

- 支持在 OpenList 中挂载多个网盘/后端，并在 SoftCloud 中显式建模。
- 能在后台查看各存储后端的大致容量占用情况，为迁移和扩容决策提供依据。

**范围**

- **D1**
  - 设计 `storage_backends` 表（存储后端配置与元信息，如类型、代号、根路径、状态、容量缓存字段等）。
  - 设计 `software_files` 表（一个软件可对应多个物理文件/后端，包含 `storage_backend_id`、`openlist_file_path`、`openlist_share_url`、`file_size_bytes` 等）。
  - 为 `software` 与文件/后端的关系预留字段或通过 `software_files` 统一建模。
- **OpenList**
  - 约定每个存储后端的根路径命名规则（如 `/aliyun-main/...`、`/onedrive-free/...`）。
  - 预留与容量信息相关的接口或运维方案（真实可用空间、总空间等）。
- **Workers**
  - 提供后台 API：
    - 列出存储后端及其元信息。
    - 列出某软件的文件列表。
  - （可选）预留内部接口/定时任务，用于从 OpenList 拉取容量信息并写入 `storage_backends.last_capacity_json / last_capacity_at`。
- **前端后台**
  - 在软件编辑页展示/配置存储后端与文件列表。
  - 在运维面板展示各存储后端的容量/占用汇总。

**待后续细化**

- 精确的表结构与索引（交给 DB schema 讨论）。
- OpenList 端实际能拿到多少容量信息（依赖具体部署环境与 driver 能力）。
- 是否需要「自动迁移」还是只做人工迁移工具。

---

### 2. 自动升级全链路（GitHub / HTML / Chrome 扩展 / OpenList / 多后端）

**目标**

- 对托管在 GitHub 或仅有官网 HTML 的软件，实现自动发现新版本。
- 通过配置化规则和定时任务更新 SoftCloud 内的软件版本信息。
- 利用 Chrome 扩展简化 HTML 规则的配置过程。
- 将新版本文件落地到合适的存储后端，前端下载无感切换到新版本。

**范围**

- **D1**
  - 设计 `software_sources` 表（软件更新源配置，支持 `github`、`html` 等类型，字段包含 `source_type`、`config_json`、启用状态、最后检查时间等）。
  - 设计 `software_source_logs` 表（每次检测日志、结果、新版本号、错误信息等）。
- **Workers**
  - **定时任务（Scheduled Worker）**
    - 对 `source_type='github'` 的源调用 GitHub API，检查 release/tag。
    - 对 `source_type='html'` 的源拉取 HTML，按规则解析版本号与下载链接。
    - 有新版本时：更新 `software` / `software_files` 的相关字段（如版本号、下载文件指向），写入日志。
  - **管理 API**
    - `POST/PUT /api/admin/software/:slug/source`：管理更新源配置。
    - `POST /api/admin/software/:slug/source/from-extension`：供 Chrome 扩展提交 HTML 规则。
- **Chrome 扩展**
  - 内容脚本：帮助用户选取“版本号元素”“下载按钮元素”，生成 CSS 选择器/正则等规则。
  - 后台：调用 SoftCloud 管理 API，提交 `source_type='html'` 的规则配置。
- **OpenList + 多后端**
  - 新版本检测到后，由后台引导选择目标存储后端，将实际安装包上传/同步。
  - 更新 `software_files` 并切换主下载文件，保持下载接口无感切换。

**待后续细化**

- GitHub、HTML 规则的具体 `config_json` 结构与校验逻辑。
- Workers 中定时任务的执行频率、超时/重试策略与错误告警。
- Chrome 扩展与后台认证方案（复用 `ADMIN_TOKEN` 还是引入 admin 用户体系）。

---

### 3. 后台管理端能力扩展

**目标**

- 提供一套围绕「软件生命周期」的后台视图和操作，而不仅是简单的增删改。

**范围**

- **软件详情页（后台）**
  - 基本信息 + 当前版本 + 历史版本/变更记录（可选）。
  - 更新源配置列表（GitHub / HTML）。
  - 存储后端与文件列表（对应 `software_files`）。
  - 软件说明（`long_desc`）采用 **Markdown 存储 + 富文本/Markdown 编辑器** 进行编辑，前端详情页渲染为格式化内容。
  - 软件相关图片（图标、截图等）统一存放在前端仓库的静态资源目录（例如 `frontend/public/software-icons/`、`frontend/public/software-screenshots/`），部署到 Cloudflare Pages 后以静态文件形式访问；数据库中 `icon_url` 等字段仅存相对路径或完整 URL，前端负责拼接域名。
- **存储后端面板**
  - 每个 `storage_backend` 的类型、状态、占用情况（总容量 / 已用 / 剩余 或 SoftCloud 侧统计）。
  - 关联的软件列表和热点软件。
- **自动升级任务面板**
  - 最近一次任务执行时间、耗时、成功/失败数量。
  - 失败源列表与错误信息，提供重新执行/编辑规则入口。

**待后续细化**

- 哪些信息从 Workers 实时查询，哪些从 D1 中读取缓存。
- 路由/页面结构交给 `frontend` 的信息架构设计处理。

---

### 4. 统计与推荐（预留）

**目标**

- 为未来的热门榜单、推荐位、搜索排序提供数据基础与查询接口。

**范围（占位）**

- **D1**
  - 利用现有 `downloads` / `comments` 表，设计聚合视图或统计字段。
- **Workers**
  - 增加按时间窗口和维度（分类/标签/平台）查询的统计 API。
- **前端**
  - 热门软件模块、榜单页、排序条件 UI。

**待后续细化**

- 评分模型、权重设计。
- 是否需要离线预计算或缓存。

---

### 5. 多用户投稿 + 管理员审核发布

**目标**

- 支持普通登录用户提交软件信息（投稿），由管理员审核后才对外展示。
- 确保所有面向访客/普通用户的列表与详情接口只展示已审核且未删除的软件。

**范围**

- **D1**
  - 在 `software` 表中扩展与投稿/审核相关的字段（示意，具体细节交由 DB 讨论）：
    - `owner_user_id`：投稿人用户 ID（`users.id`，管理员创建可为 `NULL`）。
    - `review_status`：`'pending' | 'approved' | 'rejected'`。
    - `reviewed_at`：审核时间。
    - `reviewed_by_admin_id`：审核管理员 ID（未来引入 `admin_users` 时使用，当前可为 `NULL`）。
    - `reject_reason`：驳回原因说明（可选）。
  - 统一约定：
    - 前台对外列表/详情查询一律附加 `is_published = 1 AND is_deleted = 0` 过滤；
    - 审核通过时将 `review_status='approved'` 且 `is_published=1`，驳回时 `review_status='rejected'` 且 `is_published=0`。
- **Workers API**
  - **普通用户投稿接口（需 JWT 登录）**
    - `POST /api/user/software-submissions`：创建一条待审核的软件记录，自动设置 `is_published=0`、`review_status='pending'`、`owner_user_id` 为当前用户。
    - `GET /api/user/software-submissions`：列出当前用户自己的投稿（含状态和驳回原因）。
    - `PUT /api/user/software-submissions/:id`：在 `pending` 或 `rejected` 状态下允许修改并重新提交审核。
  - **管理员审核接口**
    - 可以在现有 `/api/admin/software` 基础上扩展：
      - `GET /api/admin/software?review_status=pending`：查看待审核投稿列表。
      - `POST /api/admin/software/:id/approve`：审核通过，设置 `review_status='approved'`、`is_published=1`、`reviewed_at=NOW()`。
      - `POST /api/admin/software/:id/reject`：审核驳回，设置 `review_status='rejected'`、`is_published=0`，记录 `reject_reason`。
    - 继续使用 `ADMIN_TOKEN` / `admin_tokens` 进行权限控制。
- **前端（Nuxt）**
  - 普通用户：
    - 「提交软件」页面：表单 + 登录校验，调用投稿接口。
    - 「我的投稿」页面：展示投稿列表及状态、驳回原因，并支持在允许状态下修改重提。
  - 管理员后台：
    - 「待审核投稿」列表：支持按时间/投稿人筛选。
    - 审核详情页：展示投稿软件的所有信息，并提供通过/驳回操作。

**待后续细化**

- `software` 表中审核相关字段的最终命名与默认值策略。
- 投稿接口与现有 `/api/admin/software` 在字段校验和逻辑复用上的具体方式。
- 将来如果引入 `admin_users` / 角色体系，如何从 `ADMIN_TOKEN` 过渡到更细粒度的审核人记录。

---

### 6. 批量导入：扫描 OpenList 目录 + `.txt` 元数据 → 自动入库

**目标**

- 支持管理员在 OpenList 某个目录下批量上传安装包和对应的 `.txt` 元数据文件后，在后台手动触发“扫描目录”，由 Workers 读取目录结构和元数据，自动在 SoftCloud 中创建/更新软件记录。
- 尽量复用现有后台软件管理逻辑（`/api/admin/software` 等），避免重复实现校验与入库代码。

**范围**

- **目录结构与元数据约定**
  - 为“批量导入目录”定义约定：
    - 例如 `/aliyun-main/import/windows/2025-xx/` 这样的路径。
    - 一个软件对应一组文件：`MyApp-1.2.3-setup.exe` + `MyApp-1.2.3.txt` 等。
  - `.txt` 元数据格式建议使用 JSON 或简单的 `key=value`，至少包含：
    - `name`、`slug`、`version`、`short_desc`、`long_desc`、`homepage`、`license`、`platforms`、`icon_url`，以及可选的 `category_slugs` 等。
- **D1**
  - 设计 `import_jobs` 表，用于记录每次“扫描目录导入”的任务：
    - 字段示例：`id`、`storage_backend_id`、`directory_path`、`status`（`pending/running/completed/failed`）、`created_at`、`started_at`、`finished_at`、`result_summary`（JSON）。
  - （可选）设计 `import_job_items` 表，记录单个文件/软件在导入过程中的结果（关联软件 ID、对应 `.txt` 路径、状态、错误信息等）。
- **Workers**
  - 提供后台 API：
    - `POST /api/admin/import/scan-directory`
      - Header：`Authorization: Bearer <ADMIN_TOKEN>`。
      - Body：`storage_backend_code`（如 `aliyun-main`）、`directory_path`（OpenList 内部路径）。
      - 行为：创建一条 `import_jobs` 记录，并触发对应任务的执行（同步或异步）。
    - `GET /api/admin/import/jobs`、`GET /api/admin/import/jobs/:id`：查看导入任务列表与详情。
  - 实现导入任务执行逻辑（示意 `runImportJob(jobId)`）：
    - 通过 OpenList 的管理接口或 WebDAV 列出指定目录下的文件。
    - 按约定匹配安装包与 `.txt` 元数据成对。
    - 读取 `.txt` 文件内容并解析为配置对象。
    - 拼装调用现有后台软件创建/更新逻辑所需的字段，包括 `openlist_file_path` 和（可用时）`openlist_share_url`。
    - 将每个软件的处理结果写入 `import_jobs.result_summary` 或 `import_job_items`。
- **OpenList**
  - 确保可以：
    - 通过 API 或 WebDAV 列出指定目录的文件列表。
    - 通过 API 或 WebDAV 读取 `.txt` 元数据文件内容。
  - 如有需要，定义导入目录的命名规范（只允许在特定前缀路径下触发扫描），以防误操作。
- **前端后台**
  - 提供“批量导入任务”管理界面：
    - 表单：选择存储后端 + 填写/选择目录路径 → 触发 `scan-directory`。
    - 列表：展示历史导入任务、状态、成功/失败统计。
    - 详情：展示某次任务中每条记录的结果（已导入软件、失败原因等）。

**待后续细化**

- `.txt` 元数据的精确定义（必填字段、可选字段、校验规则）。
- 导入逻辑与现有 `/api/admin/software` 的复用方式（直接调用内部函数还是通过 HTTP 自调用）。
- 导入任务的执行模式（同步/异步）、超时与重试策略，以及出错时的回滚/幂等性处理。

**简化版实现（当前优先级）**

- 由于批量导入主要用于「初次上线/大规模初始化」而非常规功能，首版可以仅实现为 **一次性运维脚本/内部工具**：
  - 通过脚本或内部 Worker 逻辑扫描 OpenList 目录和 `.txt` / `.md` 说明文件，生成：
    - 直接可执行的 SQL 语句；或
    - 一份 JSON/Markdown 说明，由运维在 D1 控制台人工确认后执行。
  - **不要求**：
    - 新增 `import_jobs` / `import_job_items` 表；
    - 对外暴露导入相关 API；
    - 在前端提供导入任务管理 UI。
- 当未来如果批量导入变成高频需求，再考虑升级为「有任务表 + 后台管理页」的正式产品级功能。

---

### 7. 当前核心功能体检发现的改进点（概要）

> 详细实现与字段位置，交由后续 DB schema / Workers API 讨论具体落地。

- **用户与认证**
  - 建议增加：`/api/auth/logout`、用户资料修改接口。
  - 明确：登录返回的 `token` 与 `HttpOnly` Cookie 的推荐使用方式（前端尽量只依赖 Cookie）。
  - 在文档中区分普通用户体系与后台 `ADMIN_TOKEN/admin_tokens` 的关系。
- **软件下载与展示**
  - 为 `software` 增加上下架/可见性字段（如 `is_published`），前台列表只展示已发布软件。
  - 平台过滤不再使用简单 `LIKE '%platform%'`，避免误匹配，改为约定格式或更合理的数据结构。
  - 详情接口避免 `SELECT *`，明确前台可见字段集合。
  - 下载日志中，在有 JWT 的情况下记录 `user_id`，否则为 `NULL`。
- **后台管理与删除策略**
  - 为后台提供软件列表/搜索 API，而不是完全复用前台列表行为。
  - 删除软件建议改为软删除（`is_deleted` / `deleted_at`），避免数据孤儿与不可恢复操作。
- **OpenList 集成与错误处理**
  - 将「一个软件多个文件/多个后端」抽象到 `software_files`，从 schema 上解耦。
  - 下载接口在 `openlist_share_url` 缺失时返回明确错误码（如 `DOWNLOAD_URL_MISSING`），前端据此展示“暂不可下载”而不是 `{ ok: true }`。
- **安全与可观测性**
  - 在架构层预留：下载接口的 rate limit/防刷策略（按 IP / 设备指纹等）。
  - 统一错误响应格式为 JSON（包括 404），便于前端和日志系统处理。
  - 明确哪些路径必须有结构化日志（登录失败、后台操作、下载异常等）。

