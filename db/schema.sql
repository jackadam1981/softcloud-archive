-- D1 schema for SoftCloud Archive

PRAGMA foreign_keys = ON;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nickname TEXT,
  -- 简单管理员标记：1=管理员，0=普通用户
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL
);

-- Software main info
CREATE TABLE IF NOT EXISTS software (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  version TEXT,
  short_desc TEXT,
  long_desc TEXT,
  homepage TEXT,
  license TEXT,
  platforms TEXT,
  icon_url TEXT,
  openlist_share_url TEXT,
  openlist_file_path TEXT,
  is_published INTEGER NOT NULL DEFAULT 1, -- 1=已发布, 0=草稿/下架
  is_featured INTEGER NOT NULL DEFAULT 0,  -- 1=首页推荐
  is_deleted INTEGER NOT NULL DEFAULT 0,   -- 1=已删除(软删除)
  deleted_at DATETIME,
  submitter_user_id INTEGER,               -- 投稿人（普通用户）
  review_status TEXT DEFAULT 'pending',    -- 审核状态: pending/approved/rejected
  review_note TEXT,                        -- 审核备注或驳回原因
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submitter_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Software <-> Categories (many-to-many)
CREATE TABLE IF NOT EXISTS software_categories (
  software_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  PRIMARY KEY (software_id, category_id),
  FOREIGN KEY (software_id) REFERENCES software(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Download logs
CREATE TABLE IF NOT EXISTS downloads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  software_id INTEGER NOT NULL,
  user_id INTEGER,
  ip TEXT,
  ua TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (software_id) REFERENCES software(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  software_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, software_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (software_id) REFERENCES software(id) ON DELETE CASCADE
);

-- Comments & Ratings
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  software_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  rating INTEGER,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (software_id) REFERENCES software(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Admin tokens for simple admin API protection
CREATE TABLE IF NOT EXISTS admin_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes to optimize common queries

-- Users: login & lookups by email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Categories: lookups by slug, hierarchy queries
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- Software: filters by publish state / featured flag / created time
CREATE INDEX IF NOT EXISTS idx_software_is_published ON software(is_published);
CREATE INDEX IF NOT EXISTS idx_software_is_featured ON software(is_featured);
CREATE INDEX IF NOT EXISTS idx_software_created_at ON software(created_at);
CREATE INDEX IF NOT EXISTS idx_software_is_deleted ON software(is_deleted);

-- Software files: one software can have multiple physical files/backends
CREATE TABLE IF NOT EXISTS software_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  software_id INTEGER NOT NULL,
  label TEXT,              -- 展示给用户的文件名称/说明
  backend_type TEXT,       -- 例如 'openlist'
  share_url TEXT NOT NULL, -- 实际下载/分享链接
  file_path TEXT,          -- 在后端存储中的路径
  storage_backend_id INTEGER,         -- 关联的存储后端
  file_size_bytes INTEGER,           -- 文件大小（字节），可选
  is_primary INTEGER NOT NULL DEFAULT 0, -- 1=默认下载文件
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (software_id) REFERENCES software(id) ON DELETE CASCADE,
  FOREIGN KEY (storage_backend_id) REFERENCES storage_backends(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_software_files_software_id ON software_files(software_id);
CREATE INDEX IF NOT EXISTS idx_software_files_primary ON software_files(software_id, is_primary);

-- Storage backends: describe physical storage providers behind OpenList or others
CREATE TABLE IF NOT EXISTS storage_backends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,          -- 显示名称，如 "阿里云盘主账号"
  type TEXT NOT NULL,          -- 类型：openlist、onedrive 等（字符串约定）
  code TEXT UNIQUE,            -- 唯一代号，如 aliyun-main
  root_path TEXT,              -- 在 OpenList 中约定的根路径前缀
  config_json TEXT,            -- 后端配置（如 OpenList 其他参数、备注等）
  last_capacity_json TEXT,     -- 最近一次容量信息快照（JSON）
  last_capacity_at DATETIME,   -- 容量信息获取时间
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_storage_backends_type ON storage_backends(type);
CREATE INDEX IF NOT EXISTS idx_storage_backends_active ON storage_backends(is_active);
CREATE INDEX IF NOT EXISTS idx_storage_backends_code ON storage_backends(code);

-- Software sources: automatic update/check source definitions (GitHub/API/HTML)
CREATE TABLE IF NOT EXISTS software_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  software_id INTEGER NOT NULL,
  source_type TEXT NOT NULL,      -- github_api / html / other
  config_json TEXT NOT NULL,      -- 源配置，如仓库地址、选择器等
  enabled INTEGER NOT NULL DEFAULT 1, -- 是否启用该源
  last_checked_at DATETIME,
  last_result_json TEXT,          -- 最近一次检查结果快照
  last_error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (software_id) REFERENCES software(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_software_sources_software_id ON software_sources(software_id);
CREATE INDEX IF NOT EXISTS idx_software_sources_type ON software_sources(source_type);

-- Software source logs: record each auto-update check
CREATE TABLE IF NOT EXISTS software_source_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,
  software_id INTEGER NOT NULL,
  previous_version TEXT,
  new_version TEXT,
  status TEXT NOT NULL,         -- success / no_change / error
  error_message TEXT,
  raw_result_json TEXT,         -- 原始检测结果或关键信息快照
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES software_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (software_id) REFERENCES software(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_software_source_logs_source_id_created_at
  ON software_source_logs(source_id, created_at);
CREATE INDEX IF NOT EXISTS idx_software_source_logs_software_id_created_at
  ON software_source_logs(software_id, created_at);


-- Software submissions: user-submitted software proposals
CREATE TABLE IF NOT EXISTS software_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  software_id INTEGER,            -- 通过审核后可指向正式 software 记录
  title TEXT NOT NULL,
  payload_json TEXT NOT NULL,     -- 用户提交的原始数据（名称、介绍、链接等）
  status TEXT NOT NULL DEFAULT 'pending', -- pending/approved/rejected
  review_note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (software_id) REFERENCES software(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_software_submissions_user_id ON software_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_software_submissions_status ON software_submissions(status);

-- Software <-> Categories: list software by category, categories by software
CREATE INDEX IF NOT EXISTS idx_software_categories_category_id ON software_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_software_categories_software_id ON software_categories(software_id);

-- Downloads: stats by software / user / time
CREATE INDEX IF NOT EXISTS idx_downloads_software_id_created_at ON downloads(software_id, created_at);
CREATE INDEX IF NOT EXISTS idx_downloads_user_id_created_at ON downloads(user_id, created_at);

-- Favorites: list favorites by user, count by software
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_software_id ON favorites(software_id);

-- Comments: list comments by software / user
CREATE INDEX IF NOT EXISTS idx_comments_software_id_created_at ON comments(software_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_user_id_created_at ON comments(user_id, created_at);

