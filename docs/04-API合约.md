# SoftCloud API 合约

> 面向 Workers 后端工程师（`workers/`）的 API 形态约定。用于实现、联调与前后端协作。  
> 关联：[03-架构与开发顺序](./03-架构与开发顺序.md)、[06-架构待办与路线图](./06-架构待办与路线图.md)

---

## 1. 通用约定

### 1.1 认证

| 场景 | 方式 |
|------|------|
| 用户登录态 | JWT 放在 HttpOnly Cookie `auth_token` 中 |
| 管理接口 | 优先校验 JWT（已登录且 `users.is_admin=1`），否则校验 `Authorization: Bearer <ADMIN_TOKEN>` 或 `admin_tokens` 表 |

跨域请求时前端需设置 `credentials: "include"` 以携带 Cookie。

### 1.2 错误响应格式

```json
{ "error": "ERROR_CODE" }
```

可选扩展 `message` 字段（用户友好描述）。常见错误码见 §7。

### 1.3 CORS

- 支持 `Origin`、`Content-Type`、`Authorization`
- `Access-Control-Allow-Credentials: true`

---

## 2. 公开接口（前台 API）

### 2.0 认证

| 接口 | 鉴权 | 说明 |
|------|------|------|
| `POST /api/auth/register` | 无 | 注册，第一个用户自动 is_admin=1 |
| `POST /api/auth/login` | 无 | 登录，JWT 写入 HttpOnly Cookie |
| `POST /api/auth/logout` | 无 | 清除 Cookie |
| `GET /api/auth/profile` | JWT | 获取当前用户资料 |
| `PUT /api/auth/profile` | JWT | 更新昵称等 |

**register Body**：`{ "email": "string", "password": "string", "nickname": "string | null" }`  
**login Body**：`{ "email": "string", "password": "string" }`  
**profile PUT Body**：`{ "nickname": "string" }`

### 2.1 `GET /api/software`

**鉴权**：无

**Query**：`q`（关键词）、`category`（分类 slug）、`platform`（平台）、`page`、`pageSize`（默认 20，最大 50）

**响应**：
```json
{
  "items": [{ "id", "name", "slug", "version", "short_desc", "icon_url", "platforms", "created_at", "updated_at" }],
  "page": 1,
  "pageSize": 20
}
```

### 2.2 `GET /api/software/:slug`

**鉴权**：无

**响应**：`{ "software": { ... } }`，仅返回 `is_published=1` 且 `is_deleted=0` 的软件。失败 404 `NOT_FOUND`。

### 2.3 `POST /api/software/:slug/download`

**鉴权**：无（可选带 JWT 以便记录 user_id）

**行为**：写入 `downloads` 日志，302 重定向至网盘分享链接；无链接时 400 `DOWNLOAD_URL_MISSING`。

---

## 3. 软件管理（管理端）

### 3.1 `GET /api/admin/software`

**鉴权**：requireAdmin

**Query**：`q`、`page`、`pageSize`、`includeDeleted`（1=包含已软删）

**响应**：
```json
{
  "items": [{ "id", "name", "slug", "version", "is_published", "is_featured", "is_deleted", "created_at", "updated_at", "deleted_at" }],
  "page": 1,
  "pageSize": 20
}
```

---

### 3.2 `POST /api/admin/software`

**鉴权**：requireAdmin

**Body**：
```json
{
  "name": "string (必填)",
  "slug": "string (必填)",
  "version": "string | null",
  "short_desc": "string | null",
  "long_desc": "string | null",
  "homepage": "string | null",
  "license": "string | null",
  "platforms": "string | null",
  "icon_url": "string | null",
  "openlist_share_url": "string | null",
  "openlist_file_path": "string | null"
}
```

> `icon_url` 推荐使用图片仓库（如 softcloud-assets）的 CDN/Pages 地址，见 [03 图片存储约定](./03-架构与开发顺序.md#6-图片存储约定)。

**成功**：201，`{ "software": { ... } }`  
**失败**：400 `NAME_AND_SLUG_REQUIRED`、409 `SLUG_EXISTS`

---

### 3.3 `PUT /api/admin/software/:id`

**鉴权**：requireAdmin

**Body**：与 POST 字段一致，均为可选，未传则保留原值。另支持 `is_published`、`is_featured`（number 0/1）。

**成功**：200，`{ "software": { ... } }`  
**失败**：404 `NOT_FOUND`

---

### 3.4 `DELETE /api/admin/software/:id`

**鉴权**：requireAdmin

**行为**：软删除（`is_deleted=1`, `deleted_at=NOW()`）

**成功**：204 No Content

---

### 3.5 `PATCH /api/admin/software/:id/publish`（可选）

**说明**：当前未实现，上架/下架可通过 `PUT` 的 `is_published` 完成。

---

## 4. 软件-文件关联

### 4.1 `GET /api/admin/software/:id/files`

**鉴权**：requireAdmin

**响应**：
```json
{
  "items": [{ "id", "software_id", "storage_backend_id", "label", "file_path", "share_url", "is_primary", ... }]
}
```

---

### 4.2 `POST /api/admin/software/:id/files`（待实现）

**鉴权**：requireAdmin

**Body**（建议）：
```json
{
  "storage_backend_id": "number",
  "label": "string | null",
  "file_path": "string",
  "share_url": "string | null",
  "is_primary": "boolean | 0 | 1"
}
```

**成功**：201，`{ "file": { ... } }`

---

### 4.3 `DELETE /api/admin/software/:id/files/:fileId`（待实现）

**鉴权**：requireAdmin

**成功**：204 No Content

---

## 5. 用户投稿与审核

### 5.1 `POST /api/software/submit`

**鉴权**：JWT 登录

**Body**：
```json
{
  "title": "string (必填)",
  "payload": "object (必填)"
}
```

`payload` 为投稿软件结构化数据（由前端约定具体字段）。

**成功**：201，`{ "submission": { "id", "status", "created_at" } }`  
**失败**：400 `TITLE_AND_PAYLOAD_REQUIRED`、401 `UNAUTHORIZED`

---

### 5.2 `GET /api/user/submissions`

**鉴权**：JWT 登录

**响应**：
```json
{
  "items": [{ "id", "title", "status", "created_at", "reviewed_at" }]
}
```

---

### 5.3 `GET /api/admin/submissions`

**鉴权**：requireAdmin

**Query**：`status`（`pending` | `approved` | `rejected`，默认 `pending`）

**响应**：
```json
{
  "items": [{ "id", "user_id", "software_id", "title", "status", "created_at", "reviewed_at" }]
}
```

---

### 5.4 `POST /api/admin/submissions/:id/review`

**鉴权**：requireAdmin

**Body**：
```json
{
  "status": "approved" | "rejected",
  "review_note": "string | null"
}
```

**成功**：200，`{ "ok": true }`  
**失败**：400 `STATUS_REQUIRED`、`INVALID_STATUS`

---

## 6. 统计

### 6.1 `GET /api/stats/top-downloads`

**鉴权**：无

**Query**：`days`（默认 30）、`limit`（默认 10，最大 100）

**响应**：
```json
{
  "items": [{ "id", "name", "slug", "version", "download_count" }]
}
```

---

### 6.2 `GET /api/stats/summary`（预留）

**说明**：全局统计（软件数、下载数等），当前未实现。

---

## 7. OpenList 相关

### 7.1 下载接口行为

`POST /api/software/:slug/download`：

1. 查询软件（`is_published=1`, `is_deleted=0`）
2. 写入 `downloads` 日志
3. 取下载链接：优先 `software_files` 中 `is_primary=1` 的 `share_url`，否则 `software.openlist_share_url`
4. 有链接 → 302 重定向；无链接 → 400 `DOWNLOAD_URL_MISSING`

### 7.2 存储字段

- `software.openlist_share_url`、`software.openlist_file_path`
- `software_files.share_url`、`software_files.file_path`
- `storage_backends.root_path` 对应 OpenList 内部路径

### 7.3 容量信息

待 OpenList 提供或约定；计划缓存至 `storage_backends.last_capacity_json`。

> 详细集成说明见 [08-OpenList集成](./08-OpenList集成.md)。

---

## 8. 统一错误码

| Code | HTTP | 说明 |
|------|------|------|
| `UNAUTHORIZED` | 401 | 未登录或 JWT 无效 |
| `ADMIN_TOKEN_REQUIRED` | 401 | 管理接口未提供有效 Bearer |
| `FORBIDDEN` | 403 | Token 无效或权限不足 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `NAME_AND_SLUG_REQUIRED` | 400 | 创建软件缺少 name/slug |
| `SLUG_EXISTS` | 409 | slug 已存在 |
| `DOWNLOAD_URL_MISSING` | 400 | 下载时无分享链接 |
| `EMAIL_AND_PASSWORD_REQUIRED` | 400 | 注册/登录缺少必填 |
| `INVALID_EMAIL` | 400 | 邮箱格式非法 |
| `WEAK_PASSWORD` | 400 | 密码不符合复杂度 |
| `EMAIL_EXISTS` | 409 | 邮箱已注册 |
| `INVALID_CREDENTIALS` | 401 | 登录失败 |
| `RATE_LIMITED` | 429 | 下载频率超限 |
| `INTERNAL_ERROR` | 500 | 服务端异常 |

---

## 9. 实现检查清单（Workers 工程师）

- [ ] 路由路径与本文档一致
- [ ] 需要登录的接口均校验 JWT 或 requireAdmin
- [ ] D1 查询使用参数化，避免注入
- [ ] 下载接口在 302 前成功写入 `downloads`
- [ ] 非 2xx 统一返回 `{ "error": "CODE" }` 形态
- [ ] 不对外暴露内部堆栈或 SQL
