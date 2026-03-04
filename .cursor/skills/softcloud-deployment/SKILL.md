---
name: softcloud-deployment
description: Covers deployment and infrastructure for SoftCloud Archive, including Cloudflare Workers and D1 via wrangler, Cloudflare Pages for the frontend, environment variables, and domain routing. Use when setting up or modifying deployment, environments, or CI/CD.
---

# SoftCloud Deployment Assistant

## Role

- Acts as the **deployment and infrastructure specialist** for SoftCloud Archive。
- 聚焦于：Cloudflare Workers、D1、Pages 的部署方式与环境配置，而不是具体业务代码。

## When to Use This Skill

Use this skill when:

- 配置或修改 `workers/wrangler.toml`。
- 为项目创建或调整 Cloudflare D1 数据库绑定。
- 部署 Workers API 或前端 Pages。
- 规划或修改域名路由，例如：
  - `softcloud.example.com` → 前端（Pages）
  - `api.softcloud.example.com` → 后端（Workers）
  - `pan.example.com` → OpenList

## Core Instructions

1. **Workers + D1 部署**
   - 使用 `wrangler` 管理 Workers 项目：
     - 本地开发：`npx wrangler dev`
     - 部署：`npx wrangler deploy`
   - 在 Cloudflare Dashboard 中创建 D1 数据库（例如 `softcloud-db`），在 `wrangler.toml` 中绑定：
     - 使用 README 中的约定 `database_id` 字段或类似绑定方式。

2. **环境变量管理**
   - 所有敏感信息只配置在：
     - `wrangler.toml` 的 `[vars]` / `[[d1_databases]]` 等字段。
     - Cloudflare Dashboard → Workers → Settings → Variables 中。
   - 常见变量：
     - `JWT_SECRET`：JWT 签名密钥。
     - `ADMIN_TOKEN`：后台管理用 Token。
     - `OPENLIST_BASE_URL`：OpenList 站点基础地址。

3. **前端（Cloudflare Pages）部署**
   - 在仓库中创建 `frontend/`（Next.js 项目），并在 Cloudflare Pages 中：
     - 指定 `frontend` 作为构建目录。
     - 配置构建命令（例如 `npm install && npm run build`）。
     - 配置运行时环境变量：
       - `NEXT_PUBLIC_API_BASE=https://api.softcloud.example.com`

4. **域名与路由**
   - 推荐域名结构：
     - `softcloud.example.com` → Cloudflare Pages 前端。
     - `api.softcloud.example.com` → Cloudflare Workers 后端。
     - `pan.example.com` → OpenList 网盘站点。
   - 确保前端中使用的后端地址与实际 Workers 域名一致，避免混用 HTTP/HTTPS 或子域名错误。

5. **环境与阶段**

尽量区分：

- **开发环境**：本地 `wrangler dev` + 本地/开发 D1 + 本地 Next.js dev server。
- **预发布/测试环境**：可选，指向测试域名与测试 D1。
- **生产环境**：正式域名、正式 D1、受控的变更流程。

## Deployment Checklist

在部署或修改配置前，逐项检查：

- [ ] D1 数据库是否已创建并绑定到 Workers？
- [ ] 所有必需环境变量是否在 Dashboard 或 `wrangler.toml` 中配置完成？
- [ ] 前端 Pages 的 `NEXT_PUBLIC_API_BASE` 是否指向正确的 API 域名？
- [ ] 域名 DNS 与路由规则是否生效（可通过 `curl` 或浏览器验证）？
- [ ] 是否为不同环境（开发/生产）做了清晰区分，避免误用生产资源进行测试？

