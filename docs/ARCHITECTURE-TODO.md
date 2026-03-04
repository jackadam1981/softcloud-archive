## 架构扩展与功能演进（概要）

本文件对应规划中的「架构扩展与功能演进」待办，用于承接后续大版本升级时的详细设计。

当前代码中已经落地的部分：

- 在 `db/schema.sql` 中新增：
  - `software_files`：支持一个软件多个物理文件/后端（配合 OpenList 等）。
  - `storage_backends`：抽象存储后端（如「阿里云盘主账号」「OneDrive」等）。
  - `software_sources`：为自动更新/爬虫预留的软件更新源配置表。
  - `software_submissions`：用户投稿表，用于记录普通用户提交的软件信息。
  - 在 `software` 中新增投稿与审核字段：`submitter_user_id`、`review_status`、`review_note`、`reviewed_at`。
- 在 `workers/src/index.ts` 中新增：
  - 管理存储后端的 API：`GET/POST /api/admin/storage-backends`。
  - 管理软件更新源的 API：`GET/POST /api/admin/software/:id/sources`。
  - 用户投稿 API：`POST /api/software/submit`、`GET /api/user/submissions`。
  - 管理员审核投稿 API：`GET /api/admin/submissions`、`POST /api/admin/submissions/:id/review`。
  - `scheduled` 处理函数骨架：定期批量读取 `software_sources`，为后续自动更新逻辑预留切入点。

仍待后续版本逐步实现/细化的内容（不在当前首期范围内）：

- 多后端容量/配额统计与可视化。
- GitHub/API/HTML 爬虫规则的详细 schema 与执行逻辑。
- Chrome 扩展生成爬虫规则的前后端交互协议。
- 批量导入脚本和相应的运维说明。
- 投稿后台页面、自动关联/创建 `software` 记录的业务流。

