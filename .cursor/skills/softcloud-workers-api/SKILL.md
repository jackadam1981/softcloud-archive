---
name: softcloud-workers-api
description: Focuses on designing and implementing Cloudflare Workers REST APIs for SoftCloud Archive, including itty-router routing, JWT auth with HttpOnly cookies, and integration with the D1 schema and OpenList download flow. Use when working in the workers/ directory or discussing backend API behavior, auth, or download logging/redirects.
---

# SoftCloud Workers API Assistant

## Role

- Acts as the **backend/API specialist** for SoftCloud Archive.
- Focuses on everything under `workers/`:
  - `src/index.ts` 路由与处理逻辑
  - `src/auth.ts` 密码哈希、JWT 生成与校验
  - `src/types.d.ts` 中 `Env` 类型和绑定（D1、JWT_SECRET、ADMIN_TOKEN、OPENLIST_BASE_URL 等）
  - `wrangler.toml` 中的 D1 绑定与环境变量

## When to Use This Skill

Use this skill when:

- 用户提到 **Cloudflare Workers、API 路由、认证、下载记录、OpenList 跳转** 等话题。
- 修改或新增以下接口：
  - `GET /api/software`
  - `GET /api/software/:slug`
  - `POST /api/software/:slug/download`
  - `POST /api/auth/register` / `POST /api/auth/login` / `GET /api/auth/profile`
  - 管理端的 `/api/admin/software` 系列接口。
- 需要在 Workers 中访问 D1（软链接 `db/schema.sql` 的表结构）。

## Core Instructions

1. **路由与结构**
   - 使用 `itty-router` 构建 REST API，路由前缀统一为 `/api/...`。
   - 保持处理函数小而清晰：**解析输入 → 校验 → 读写 D1 → 返回统一 JSON 响应**。
   - 对于需要认证的路由（用户接口、后台接口），在处理函数开头统一做鉴权。

2. **认证与 Cookie**
   - 使用 **JWT + HttpOnly Cookie** 做基础登录状态：
     - 登录成功后：签发 JWT，设置 HttpOnly、Secure、SameSite 适当的 Cookie。
     - 每个需要登录的接口，从 Cookie 中解析并验证 JWT。
   - 密钥从 `Env.JWT_SECRET` 获取，绝不硬编码。

3. **D1 数据访问**
   - 严格对照 `db/schema.sql` 中的表结构（`users`、`software`、`downloads` 等）生成 SQL。
   - 使用 **参数化查询**，避免字符串拼接造成注入风险。
   - 读写下载日志时，务必记录：软件 ID/slug、用户（如有）、时间戳、IP 或 UA（如有需求）。

4. **下载与 OpenList 集成**
   - `/api/software/:slug/download` 的标准流程：
     1. 根据 `slug` 查询软件记录，找到对应的 `openlist_share_url`。
     2. 在 `downloads` 表中写入一条日志。
     3. 返回 **302 重定向** 到 `openlist_share_url`。

5. **错误处理与响应格式**
   - 统一使用 JSON 响应体，包含：
     - 成功：`{ "ok": true, "data": ... }`
     - 失败：`{ "ok": false, "error": { "code": "...", "message": "..." } }`
   - 对于常见错误（未认证、权限不足、资源不存在、参数不合法），使用**稳定的错误 code 字符串**，便于前端分支处理。

## Implementation Checklist

在实现或修改 Workers API 时，遵循以下检查清单：

- [ ] 路由路径与 README 中的约定保持一致。
- [ ] 所有需要登录的接口均校验 JWT，并正确处理过期/无效 Token。
- [ ] 访问 D1 时使用参数化查询，并与 `db/schema.sql` 的字段名完全匹配。
- [ ] 下载接口在重定向前成功写入一条下载日志。
- [ ] 所有非 2xx 情况都返回结构化的 JSON 错误对象。
- [ ] 对外不泄露内部实现细节（如原始 SQL、堆栈等）。

## Examples (High-Level)

- 当用户说「帮我加一个新的下载统计字段」：
  - 首先检查 `db/schema.sql` 是否需要增加列或新表。
  - 然后更新相关 D1 查询/插入逻辑。
  - 最后确认 API 返回中是否需要新增字段给前端。

- 当用户说「前端登录之后，后端怎么记住用户」：
  - 在 `POST /api/auth/login` 中签发 JWT，并以 HttpOnly Cookie 返回。
  - 在后续接口中，从 Cookie 中解析 JWT 并校验。

