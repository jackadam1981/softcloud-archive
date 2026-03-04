import { Router } from "itty-router";
import type { Env } from "./types";
import { getAuthTokenFromRequest, signToken, verifyToken, hashPassword, verifyPassword } from "./auth";

const router = Router();

// 简单下载接口频率控制（基于内存的轻量实现）
const downloadRateBucket: Map<string, { count: number; ts: number }> = new Map();

function checkDownloadRateLimit(ip: string | null): boolean {
  if (!ip) return true;
  const now = Date.now();
  const windowMs = 60_000; // 1 分钟窗口
  const limit = 120; // 每 IP 每分钟最多 120 次（Cloudflare 侧建议再配合更严格规则）

  const entry = downloadRateBucket.get(ip);
  if (!entry || now - entry.ts > windowMs) {
    downloadRateBucket.set(ip, { count: 1, ts: now });
    return true;
  }
  if (entry.count >= limit) {
    return false;
  }
  entry.count += 1;
  return true;
}

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  const h = new Headers(headers);
  if (!h.has("Content-Type")) {
    h.set("Content-Type", "application/json");
  }
  return new Response(JSON.stringify(data), { status, headers: h });
}

function applyCors(request: Request, response: Response): Response {
  const origin = request.headers.get("Origin") || "*";
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.append("Vary", "Origin");
  headers.set("Access-Control-Allow-Credentials", "true");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

router.get("/", () => json({ ok: true, service: "SoftCloud API" }));

// CORS 预检请求处理（主要用于本地开发和跨域客户端）
router.options("/api/*", (request: Request) => {
  const origin = request.headers.get("Origin") || "*";
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    request.headers.get("Access-Control-Request-Headers") || "Content-Type, Authorization"
  );
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Max-Age", "86400");
  return new Response(null, { status: 204, headers });
});

// Auth: register
router.post("/api/auth/register", async (request: Request, env: Env) => {
  const body = await request.json().catch(() => null);
  if (!body || !body.email || !body.password) {
    return json({ error: "EMAIL_AND_PASSWORD_REQUIRED" }, 400);
  }

  const email = String(body.email).trim();
  const password = String(body.password);

  // 基本邮箱与密码复杂度校验
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return json({ error: "INVALID_EMAIL" }, 400);
  }
  if (password.length < 8 || !/[0-9]/.test(password) || !/[A-Za-z]/.test(password)) {
    return json({ error: "WEAK_PASSWORD" }, 400);
  }

  const passwordHash = await hashPassword(password);

  try {
    // 第一个注册的用户自动成为管理员
    const countRow = await env.DB.prepare("SELECT COUNT(*) AS c FROM users").first();
    const isFirstUser = !countRow || (countRow as any).c === 0;

    const stmt = env.DB.prepare(
      "INSERT INTO users (email, password_hash, nickname, is_admin) VALUES (?1, ?2, ?3, ?4) RETURNING id, email, nickname, is_admin, created_at"
    ).bind(email, passwordHash, body.nickname || null, isFirstUser ? 1 : 0);
    const result = await stmt.first();
    return json({ user: result }, 201);
  } catch (e: any) {
    if (String(e?.message || "").includes("UNIQUE")) {
      return json({ error: "EMAIL_EXISTS" }, 409);
    }
    console.error("auth_register_internal_error", e);
    return json({ error: "INTERNAL_ERROR" }, 500);
  }
});

// Auth: login
router.post("/api/auth/login", async (request: Request, env: Env) => {
  const body = await request.json().catch(() => null);
  if (!body || !body.email || !body.password) {
    return json({ error: "EMAIL_AND_PASSWORD_REQUIRED" }, 400);
  }

  const row = await env.DB.prepare(
    "SELECT id, email, password_hash FROM users WHERE email = ?1"
  ).bind(body.email).first();

  if (!row) {
    console.log("auth_login_failed", { email: body.email });
    return json({ error: "INVALID_CREDENTIALS" }, 401);
  }

  const ok = await verifyPassword(body.password, row.password_hash);
  if (!ok) {
    console.log("auth_login_failed", { email: body.email });
    return json({ error: "INVALID_CREDENTIALS" }, 401);
  }

  const token = signToken(env, { sub: row.id, email: row.email });

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.append(
    "Set-Cookie",
    `auth_token=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}`
  );

  return new Response(JSON.stringify({ token }), { status: 200, headers });
});

// Auth: profile
router.get("/api/auth/profile", async (request: Request, env: Env) => {
  const token = getAuthTokenFromRequest(request);
  if (!token) {
    return json({ error: "UNAUTHORIZED" }, 401);
  }
  const payload = verifyToken(env, token);
  if (!payload) {
    return json({ error: "UNAUTHORIZED" }, 401);
  }
  const row = await env.DB.prepare(
    "SELECT id, email, nickname, created_at FROM users WHERE id = ?1"
  ).bind(payload.sub).first();
  if (!row) {
    return json({ error: "USER_NOT_FOUND" }, 404);
  }
  return json({ user: row });
});

// Auth: update profile
router.put("/api/auth/profile", async (request: Request, env: Env) => {
  const token = getAuthTokenFromRequest(request);
  if (!token) {
    return json({ error: "UNAUTHORIZED" }, 401);
  }
  const payload = verifyToken(env, token);
  if (!payload) {
    return json({ error: "UNAUTHORIZED" }, 401);
  }
  const body = await request.json().catch(() => ({}));
  const nickname = body.nickname as string | undefined;
  if (nickname === undefined) {
    return json({ error: "NO_CHANGES" }, 400);
  }
  await env.DB.prepare("UPDATE users SET nickname = ?1 WHERE id = ?2").bind(nickname, payload.sub).run();
  const row = await env.DB.prepare(
    "SELECT id, email, nickname, created_at FROM users WHERE id = ?1"
  ).bind(payload.sub).first();
  return json({ user: row });
});

// Auth: logout
router.post("/api/auth/logout", async () => {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.append("Set-Cookie", "auth_token=; HttpOnly; Path=/; Max-Age=0");
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
});

// Software list
router.get("/api/software", async (request: Request, env: Env) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const categorySlug = url.searchParams.get("category");
  const platform = url.searchParams.get("platform");
  const page = Number(url.searchParams.get("page") || "1");
  const pageSize = Math.min(Number(url.searchParams.get("pageSize") || "20"), 50);
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const params: any[] = [];

  if (q) {
    where.push("(s.name LIKE ? OR s.short_desc LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }
  if (platform) {
    // 平台字段按 JSON 字符串存储，使用包含双引号的 LIKE 避免误匹配
    where.push("s.platforms LIKE ?");
    params.push(`%"${platform}"%`);
  }
  if (categorySlug) {
    where.push("EXISTS (SELECT 1 FROM software_categories sc JOIN categories c ON sc.category_id = c.id WHERE sc.software_id = s.id AND c.slug = ?)");
    params.push(categorySlug);
  }

  // 只展示已发布且未被软删除的软件
  where.push("s.is_published = 1");
  where.push("s.is_deleted = 0");

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const sql = `
    SELECT s.id, s.name, s.slug, s.version, s.short_desc, s.icon_url, s.platforms,
           s.created_at, s.updated_at
    FROM software s
    ${whereSql}
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?`;

  params.push(pageSize, offset);

  const stmt = env.DB.prepare(sql).bind(...params);
  const { results } = await stmt.all();

  return json({ items: results, page, pageSize });
});

// Software detail
router.get("/api/software/:slug", async (request: any, env: Env) => {
  const slug = request.params.slug as string;
  const row = await env.DB.prepare(
    `SELECT id, name, slug, version, short_desc, long_desc,
            homepage, license, platforms, icon_url,
            openlist_share_url, openlist_file_path,
            is_published, is_featured,
            created_at, updated_at
     FROM software
     WHERE slug = ?1 AND is_deleted = 0 AND is_published = 1`
  ).bind(slug).first();
  if (!row) {
    return json({ error: "NOT_FOUND" }, 404);
  }
  return json({ software: row });
});

// Download tracking + redirect
router.post("/api/software/:slug/download", async (request: any, env: Env) => {
  const slug = request.params.slug as string;
  const software = await env.DB.prepare(
    `SELECT id, openlist_share_url FROM software
     WHERE slug = ?1 AND is_deleted = 0 AND is_published = 1`
  ).bind(slug).first();
  if (!software) {
    return json({ error: "NOT_FOUND" }, 404);
  }

  const token = getAuthTokenFromRequest(request);
  let userId: number | null = null;
  if (token) {
    const payload = verifyToken(env, token);
    if (payload) {
      userId = payload.sub;
    }
  }

  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "";
  const ua = request.headers.get("user-agent") || "";

  if (!checkDownloadRateLimit(ip)) {
    console.warn("download_rate_limited", { slug, ip });
    return json({ error: "RATE_LIMITED" }, 429);
  }

  await env.DB.prepare(
    "INSERT INTO downloads (software_id, user_id, ip, ua) VALUES (?1, ?2, ?3, ?4)"
  ).bind(software.id, userId, ip, ua).run();

  // 优先从 software_files 中寻找主文件，其次回退到软件表上的链接
  const file = await env.DB.prepare(
    `SELECT share_url FROM software_files
     WHERE software_id = ?1 AND is_primary = 1
     ORDER BY id DESC LIMIT 1`
  ).bind(software.id).first();

  const shareUrl: string | null = file?.share_url || software.openlist_share_url || null;

  if (!shareUrl) {
    console.warn("download_url_missing", { slug, softwareId: software.id });
    return json({ error: "DOWNLOAD_URL_MISSING" }, 400);
  }

  return Response.redirect(shareUrl, 302);
});

// Stats: top downloads
router.get("/api/stats/top-downloads", async (request: Request, env: Env) => {
  const url = new URL(request.url);
  const daysParam = url.searchParams.get("days") || "30";
  const limit = Math.min(Number(url.searchParams.get("limit") || "10"), 100);

  const days = Number(daysParam);
  const whereTime =
    !Number.isNaN(days) && days > 0 ? "AND d.created_at >= datetime('now', ?1)" : "";

  const sql = `
    SELECT s.id,
           s.name,
           s.slug,
           s.version,
           COUNT(d.id) AS download_count
    FROM software s
    JOIN downloads d ON d.software_id = s.id
    WHERE s.is_deleted = 0 AND s.is_published = 1
    ${whereTime}
    GROUP BY s.id, s.name, s.slug, s.version
    ORDER BY download_count DESC
    LIMIT ?2
  `;

  const bindParams: any[] = [];
  if (whereTime) {
    bindParams.push(`-${days} days`);
  }
  bindParams.push(limit);

  const { results } = await env.DB.prepare(sql).bind(...bindParams).all();
  return json({ items: results || [] });
});

// Admin middleware
async function requireAdmin(request: Request, env: Env): Promise<Response | null> {
  // 1) 先看是否有已登录的管理员用户（基于 JWT）
  const userToken = getAuthTokenFromRequest(request);
  if (userToken) {
    const payload = verifyToken(env, userToken);
    if (payload) {
      const row = await env.DB.prepare(
        "SELECT is_admin FROM users WHERE id = ?1"
      ).bind(payload.sub).first();
      if (row && (row as any).is_admin === 1) {
        return null;
      }
    }
  }

  // 2) 兼容原有 ADMIN_TOKEN 方案（Authorization: Bearer ...）
  const auth = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return json({ error: "ADMIN_TOKEN_REQUIRED" }, 401);
  }
  const token = auth.slice("Bearer ".length);
  if (token !== env.ADMIN_TOKEN) {
    const row = await env.DB.prepare("SELECT id FROM admin_tokens WHERE token = ?1").bind(token).first();
    if (!row) {
      return json({ error: "FORBIDDEN" }, 403);
    }
  }
  return null;
}

// Admin: manage storage backends (basic list + create)
router.get("/api/admin/storage-backends", async (request: Request, env: Env) => {
  const maybeError = await requireAdmin(request, env);
  if (maybeError) return maybeError;

  const rows = await env.DB.prepare(
    `SELECT id, name, type, code, root_path, is_active,
            last_capacity_json, last_capacity_at, created_at
     FROM storage_backends
     ORDER BY id ASC`
  ).all();
  return json({ items: rows.results || [] });
});

router.post("/api/admin/storage-backends", async (request: Request, env: Env) => {
  const maybeError = await requireAdmin(request, env);
  if (maybeError) return maybeError;

  const body = await request.json().catch(() => null);
  if (!body || !body.name || !body.type) {
    return json({ error: "NAME_AND_TYPE_REQUIRED" }, 400);
  }
  const stmt = env.DB.prepare(
    `INSERT INTO storage_backends (name, type, code, root_path, config_json, is_active)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     RETURNING id, name, type, code, root_path, is_active, created_at`
  ).bind(
    body.name,
    body.type,
    body.code || null,
    body.root_path || null,
    body.config_json || null,
    body.is_active ?? 1
  );
  const row = await stmt.first();
  console.log("admin_create_storage_backend", { id: row?.id, type: row?.type });
  return json({ backend: row }, 201);
});

// Admin: update storage backend
router.put("/api/admin/storage-backends/:id", async (request: any, env: Env) => {
  const maybeError = await requireAdmin(request, env);
  if (maybeError) return maybeError;

  const id = Number(request.params.id);
  const body = await request.json().catch(() => ({}));

  const existing = await env.DB.prepare(
    "SELECT id, name, type, code, root_path, config_json, is_active FROM storage_backends WHERE id = ?1"
  ).bind(id).first();
  if (!existing) {
    return json({ error: "NOT_FOUND" }, 404);
  }

  const updated = {
    name: body.name ?? existing.name,
    type: body.type ?? existing.type,
    code: body.code ?? existing.code,
    root_path: body.root_path ?? existing.root_path,
    config_json: body.config_json ?? existing.config_json,
    is_active:
      typeof body.is_active === "number"
        ? body.is_active
        : typeof body.is_active === "boolean"
        ? body.is_active ? 1 : 0
        : existing.is_active,
  };

  await env.DB.prepare(
    `UPDATE storage_backends
     SET name = ?1,
         type = ?2,
         code = ?3,
         root_path = ?4,
         config_json = ?5,
         is_active = ?6
     WHERE id = ?7`
  ).bind(
    updated.name,
    updated.type,
    updated.code,
    updated.root_path,
    updated.config_json,
    updated.is_active,
    id
  ).run();

  const row = await env.DB.prepare(
    `SELECT id, name, type, code, root_path, is_active,
            last_capacity_json, last_capacity_at, created_at
     FROM storage_backends
     WHERE id = ?1`
  ).bind(id).first();

  console.log("admin_update_storage_backend", { id, code: row?.code });
  return json({ backend: row });
});

// Admin: list files of a software
router.get("/api/admin/software/:id/files", async (request: any, env: Env) => {
  const maybeError = await requireAdmin(request, env);
  if (maybeError) return maybeError;

  const softwareId = Number(request.params.id);
  const { results } = await env.DB.prepare(
    `SELECT f.id,
            f.label,
            f.backend_type,
            f.share_url,
            f.file_path,
            f.storage_backend_id,
            f.file_size_bytes,
            f.is_primary,
            f.created_at,
            b.name     AS backend_name,
            b.type     AS backend_type_name,
            b.code     AS backend_code,
            b.root_path AS backend_root_path
     FROM software_files f
     LEFT JOIN storage_backends b ON f.storage_backend_id = b.id
     WHERE f.software_id = ?1
     ORDER BY f.is_primary DESC, f.id ASC`
  ).bind(softwareId).all();

  return json({ items: results || [] });
});

// Admin: configure software sources (automatic update)
router.get("/api/admin/software/:id/sources", async (request: any, env: Env) => {
  const maybeError = await requireAdmin(request, env);
  if (maybeError) return maybeError;
  const softwareId = Number(request.params.id);
  const { results } = await env.DB.prepare(
    `SELECT id, source_type, config_json, enabled,
            last_checked_at, last_result_json, last_error, created_at, updated_at
     FROM software_sources
     WHERE software_id = ?1
     ORDER BY id ASC`
  ).bind(softwareId).all();
  return json({ items: results || [] });
});

router.post("/api/admin/software/:id/sources", async (request: any, env: Env) => {
  const maybeError = await requireAdmin(request, env);
  if (maybeError) return maybeError;
  const softwareId = Number(request.params.id);
  const body = await request.json().catch(() => null);
  if (!body || !body.source_type || !body.config_json) {
    return json({ error: "SOURCE_TYPE_AND_CONFIG_REQUIRED" }, 400);
  }
  const stmt = env.DB.prepare(
    `INSERT INTO software_sources (software_id, source_type, config_json, enabled)
     VALUES (?1, ?2, ?3, ?4)
     RETURNING id, source_type, config_json, enabled, created_at`
  ).bind(softwareId, body.source_type, body.config_json, body.enabled ?? 1);
  const row = await stmt.first();
  console.log("admin_create_software_source", { softwareId, sourceId: row?.id });
  return json({ source: row }, 201);
});

// Admin: update a software source
router.put("/api/admin/software/:id/sources/:sourceId", async (request: any, env: Env) => {
  const maybeError = await requireAdmin(request, env);
  if (maybeError) return maybeError;

  const softwareId = Number(request.params.id);
  const sourceId = Number(request.params.sourceId);
  const body = await request.json().catch(() => ({}));

  const existing = await env.DB.prepare(
    `SELECT id, software_id, source_type, config_json, enabled
     FROM software_sources
     WHERE id = ?1 AND software_id = ?2`
  ).bind(sourceId, softwareId).first();

  if (!existing) {
    return json({ error: "NOT_FOUND" }, 404);
  }

  const updated = {
    source_type: body.source_type ?? existing.source_type,
    config_json: body.config_json ?? existing.config_json,
    enabled:
      typeof body.enabled === "number"
        ? body.enabled
        : typeof body.enabled === "boolean"
        ? body.enabled ? 1 : 0
        : existing.enabled,
  };

  await env.DB.prepare(
    `UPDATE software_sources
     SET source_type = ?1,
         config_json = ?2,
         enabled = ?3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?4 AND software_id = ?5`
  ).bind(
    updated.source_type,
    updated.config_json,
    updated.enabled,
    sourceId,
    softwareId
  ).run();

  const row = await env.DB.prepare(
    `SELECT id, source_type, config_json, enabled,
            last_checked_at, last_result_json, last_error, created_at, updated_at
     FROM software_sources
     WHERE id = ?1`
  ).bind(sourceId).first();

  console.log("admin_update_software_source", { softwareId, sourceId });
  return json({ source: row });
});

// Admin: get recent source logs
router.get("/api/admin/software/:id/source-logs", async (request: any, env: Env) => {
  const maybeError = await requireAdmin(request, env);
  if (maybeError) return maybeError;

  const softwareId = Number(request.params.id);
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || "50"), 200);

  const { results } = await env.DB.prepare(
    `SELECT id, source_id, software_id,
            previous_version, new_version,
            status, error_message,
            raw_result_json,
            created_at
     FROM software_source_logs
     WHERE software_id = ?1
     ORDER BY created_at DESC
     LIMIT ?2`
  ).bind(softwareId, limit).all();

  return json({ items: results || [] });
});

// User: submit software (contribution)
router.post("/api/software/submit", async (request: Request, env: Env) => {
  const token = getAuthTokenFromRequest(request);
  if (!token) {
    return json({ error: "UNAUTHORIZED" }, 401);
  }
  const payload = verifyToken(env, token);
  if (!payload) {
    return json({ error: "UNAUTHORIZED" }, 401);
  }
  const body = await request.json().catch(() => null);
  if (!body || !body.title || !body.payload) {
    return json({ error: "TITLE_AND_PAYLOAD_REQUIRED" }, 400);
  }
  const stmt = env.DB.prepare(
    `INSERT INTO software_submissions (user_id, title, payload_json)
     VALUES (?1, ?2, ?3)
     RETURNING id, status, created_at`
  ).bind(payload.sub, body.title, JSON.stringify(body.payload));
  const row = await stmt.first();
  console.log("user_submit_software", { userId: payload.sub, submissionId: row?.id });
  return json({ submission: row }, 201);
});

// User: list own submissions
router.get("/api/user/submissions", async (request: Request, env: Env) => {
  const token = getAuthTokenFromRequest(request);
  if (!token) {
    return json({ error: "UNAUTHORIZED" }, 401);
  }
  const payload = verifyToken(env, token);
  if (!payload) {
    return json({ error: "UNAUTHORIZED" }, 401);
  }
  const { results } = await env.DB.prepare(
    `SELECT id, title, status, created_at, reviewed_at
     FROM software_submissions
     WHERE user_id = ?1
     ORDER BY created_at DESC`
  ).bind(payload.sub).all();
  return json({ items: results || [] });
});

// Admin: review submissions
router.get("/api/admin/submissions", async (request: Request, env: Env) => {
  const maybeError = await requireAdmin(request, env);
  if (maybeError) return maybeError;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "pending";

  const { results } = await env.DB.prepare(
    `SELECT id, user_id, software_id, title, status,
            created_at, reviewed_at
     FROM software_submissions
     WHERE status = ?1
     ORDER BY created_at ASC`
  ).bind(status).all();

  return json({ items: results || [] });
});

router.post("/api/admin/submissions/:id/review", async (request: any, env: Env) => {
  const maybeError = await requireAdmin(request, env);
  if (maybeError) return maybeError;

  const id = Number(request.params.id);
  const body = await request.json().catch(() => null);
  if (!body || !body.status) {
    return json({ error: "STATUS_REQUIRED" }, 400);
  }
  const status = body.status as string;
  if (!["approved", "rejected"].includes(status)) {
    return json({ error: "INVALID_STATUS" }, 400);
  }

  await env.DB.prepare(
    `UPDATE software_submissions
     SET status = ?1, review_note = ?2, reviewed_at = CURRENT_TIMESTAMP
     WHERE id = ?3`
  ).bind(status, body.review_note || null, id).run();

  console.log("admin_review_submission", { id, status });
  return json({ ok: true });
});

// Admin: list/search software
router.get("/api/admin/software", async (request: Request, env: Env) => {
  const maybeError = await requireAdmin(request, env);
  if (maybeError) return maybeError;

  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const includeDeleted = url.searchParams.get("includeDeleted") === "1";
  const page = Number(url.searchParams.get("page") || "1");
  const pageSize = Math.min(Number(url.searchParams.get("pageSize") || "20"), 100);
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const params: any[] = [];

  if (q) {
    where.push("(name LIKE ? OR slug LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }
  if (!includeDeleted) {
    where.push("is_deleted = 0");
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const sql = `
    SELECT id, name, slug, version, is_published, is_featured,
           is_deleted, created_at, updated_at, deleted_at
    FROM software
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?`;

  params.push(pageSize, offset);

  const stmt = env.DB.prepare(sql).bind(...params);
  const { results } = await stmt.all();

  return json({ items: results, page, pageSize });
});

// Admin: create software
router.post("/api/admin/software", async (request: Request, env: Env) => {
  const maybeError = await requireAdmin(request, env);
  if (maybeError) return maybeError;

  const body = await request.json().catch(() => null);
  if (!body || !body.name || !body.slug) {
    return json({ error: "NAME_AND_SLUG_REQUIRED" }, 400);
  }

  const stmt = env.DB.prepare(
    `INSERT INTO software
     (name, slug, version, short_desc, long_desc, homepage, license, platforms, icon_url, openlist_share_url, openlist_file_path)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
     RETURNING *`
  ).bind(
    body.name,
    body.slug,
    body.version || null,
    body.short_desc || null,
    body.long_desc || null,
    body.homepage || null,
    body.license || null,
    body.platforms || null,
    body.icon_url || null,
    body.openlist_share_url || null,
    body.openlist_file_path || null
  );

  try {
    const result = await stmt.first();
    console.log("admin_create_software", { id: result?.id, slug: result?.slug });
    return json({ software: result }, 201);
  } catch (e: any) {
    if (String(e?.message || "").includes("UNIQUE")) {
      return json({ error: "SLUG_EXISTS" }, 409);
    }
    console.error("admin_create_software_internal_error", e);
    return json({ error: "INTERNAL_ERROR" }, 500);
  }
});

// Admin: update software
router.put("/api/admin/software/:id", async (request: any, env: Env) => {
  const maybeError = await requireAdmin(request, env);
  if (maybeError) return maybeError;

  const id = Number(request.params.id);
  const body = await request.json().catch(() => ({}));

  const row = await env.DB.prepare("SELECT * FROM software WHERE id = ?1").bind(id).first();
  if (!row) {
    return json({ error: "NOT_FOUND" }, 404);
  }

  const updated = {
    name: body.name ?? row.name,
    slug: body.slug ?? row.slug,
    version: body.version ?? row.version,
    short_desc: body.short_desc ?? row.short_desc,
    long_desc: body.long_desc ?? row.long_desc,
    homepage: body.homepage ?? row.homepage,
    license: body.license ?? row.license,
    platforms: body.platforms ?? row.platforms,
    icon_url: body.icon_url ?? row.icon_url,
    openlist_share_url: body.openlist_share_url ?? row.openlist_share_url,
    openlist_file_path: body.openlist_file_path ?? row.openlist_file_path,
    is_published: typeof body.is_published === "number" ? body.is_published : row.is_published,
    is_featured: typeof body.is_featured === "number" ? body.is_featured : row.is_featured,
  };

  const stmt = env.DB.prepare(
    `UPDATE software
     SET name = ?1, slug = ?2, version = ?3, short_desc = ?4, long_desc = ?5,
         homepage = ?6, license = ?7, platforms = ?8, icon_url = ?9,
         openlist_share_url = ?10, openlist_file_path = ?11,
         is_published = ?12, is_featured = ?13,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?14`
  ).bind(
    updated.name,
    updated.slug,
    updated.version,
    updated.short_desc,
    updated.long_desc,
    updated.homepage,
    updated.license,
    updated.platforms,
    updated.icon_url,
    updated.openlist_share_url,
    updated.openlist_file_path,
    updated.is_published,
    updated.is_featured,
    id
  );

  await stmt.run();

  const newRow = await env.DB.prepare("SELECT * FROM software WHERE id = ?1").bind(id).first();
  console.log("admin_update_software", { id, slug: newRow?.slug });
  return json({ software: newRow });
});

// Admin: delete software
router.delete("/api/admin/software/:id", async (request: any, env: Env) => {
  const maybeError = await requireAdmin(request, env);
  if (maybeError) return maybeError;

  const id = Number(request.params.id);
  await env.DB.prepare(
    `UPDATE software
     SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP
     WHERE id = ?1`
  ).bind(id).run();
  console.log("admin_soft_delete_software", { id });
  return new Response(null, { status: 204 });
});

// 404 handler
router.all("*", () => json({ error: "NOT_FOUND" }, 404));

export default {
  fetch(request: Request, env: Env, ctx: any): Promise<Response> | Response {
    const result = router.handle(request, env, ctx);
    if (result instanceof Promise) {
      return result.then((res) => applyCors(request, res as Response));
    }
    return applyCors(request, result as Response);
  },
  // Scheduled handler placeholder: periodic tasks such as checking software_sources
  async scheduled(event: any, env: Env, ctx: any): Promise<void> {
    ctx.waitUntil((async () => {
      // 简单实现：每次定时任务检查一批启用的软件更新源
      const { results } = await env.DB.prepare(
        `SELECT id, software_id, source_type, config_json
         FROM software_sources
         WHERE enabled = 1
         ORDER BY last_checked_at IS NULL DESC, last_checked_at ASC
         LIMIT 10`
      ).all();

      const sources = results || [];
      console.log("scheduled_check_sources_batch", { count: sources.length });

      for (const src of sources as any[]) {
        try {
          const config = JSON.parse(src.config_json || "{}");
          const softwareRow = await env.DB.prepare(
            "SELECT id, version FROM software WHERE id = ?1"
          ).bind(src.software_id).first();
          const previousVersion: string | null = softwareRow?.version || null;

          let newVersion: string | null = null;
          let rawResult: unknown = null;

          if (src.source_type === "github") {
            const repo = config.repo as string | undefined;
            if (!repo) {
              throw new Error("MISSING_GITHUB_REPO");
            }
            const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
              headers: { "User-Agent": "softcloud-archive-bot" },
            });
            if (!res.ok) {
              throw new Error(`GITHUB_API_ERROR_${res.status}`);
            }
            const jsonBody = await res.json();
            rawResult = { tag_name: jsonBody.tag_name, name: jsonBody.name };
            newVersion = (jsonBody.tag_name || jsonBody.name || "").toString();
          } else if (src.source_type === "html") {
            // 轻量级 HTML 检测：仅请求页面并记录状态，解析规则留待后续细化
            const url = config.url as string | undefined;
            if (!url) {
              throw new Error("MISSING_HTML_URL");
            }
            const res = await fetch(url, { method: "GET" });
            rawResult = { status: res.status };
            if (!res.ok) {
              throw new Error(`HTML_FETCH_ERROR_${res.status}`);
            }
            // 具体版本号提取规则（CSS 选择器 + 正则）交由后续实现，这里暂不自动更新版本
            newVersion = previousVersion;
          } else {
            throw new Error(`UNSUPPORTED_SOURCE_TYPE_${src.source_type}`);
          }

          const status = newVersion && previousVersion !== newVersion ? "success" : "no_change";

          if (status === "success") {
            await env.DB.prepare(
              "UPDATE software SET version = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2"
            ).bind(newVersion, src.software_id).run();
          }

          await env.DB.prepare(
            `INSERT INTO software_source_logs
             (source_id, software_id, previous_version, new_version, status, error_message, raw_result_json)
             VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6)`
          ).bind(
            src.id,
            src.software_id,
            previousVersion,
            newVersion,
            status,
            JSON.stringify(rawResult)
          ).run();

          await env.DB.prepare(
            `UPDATE software_sources
             SET last_checked_at = CURRENT_TIMESTAMP,
                 last_result_json = ?1,
                 last_error = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?2`
          ).bind(
            JSON.stringify({ status, previousVersion, newVersion }),
            src.id
          ).run();
        } catch (err: any) {
          console.error("scheduled_check_source_error", { id: src.id, err: String(err?.message || err) });
          await env.DB.prepare(
            `INSERT INTO software_source_logs
             (source_id, software_id, previous_version, new_version, status, error_message, raw_result_json)
             VALUES (?1, ?2, NULL, NULL, 'error', ?3, NULL)`
          ).bind(
            src.id,
            src.software_id,
            String(err?.message || err)
          ).run();

          await env.DB.prepare(
            `UPDATE software_sources
             SET last_checked_at = CURRENT_TIMESTAMP,
                 last_error = ?1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?2`
          ).bind(
            String(err?.message || err),
            src.id
          ).run();
        }
      }
    })());
  }
};

