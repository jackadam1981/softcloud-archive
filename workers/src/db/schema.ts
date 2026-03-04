import {
  sqliteTable,
  integer,
  text,
} from "drizzle-orm/sqlite-core";

// Users
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  nickname: text("nickname"),
  isAdmin: integer("is_admin").notNull().default(0),
  createdAt: text("created_at"),
});

// Categories
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  parentId: integer("parent_id"),
});

// Software
export const software = sqliteTable("software", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  version: text("version"),
  shortDesc: text("short_desc"),
  longDesc: text("long_desc"),
  homepage: text("homepage"),
  license: text("license"),
  platforms: text("platforms"),
  iconUrl: text("icon_url"),
  openlistShareUrl: text("openlist_share_url"),
  openlistFilePath: text("openlist_file_path"),
  isPublished: integer("is_published").notNull().default(1),
  isFeatured: integer("is_featured").notNull().default(0),
  isDeleted: integer("is_deleted").notNull().default(0),
  deletedAt: text("deleted_at"),
  submitterUserId: integer("submitter_user_id"),
  reviewStatus: text("review_status").default("pending"),
  reviewNote: text("review_note"),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

// Software <-> Categories
export const softwareCategories = sqliteTable("software_categories", {
  softwareId: integer("software_id").notNull(),
  categoryId: integer("category_id").notNull(),
});

// Downloads
export const downloads = sqliteTable("downloads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  softwareId: integer("software_id").notNull(),
  userId: integer("user_id"),
  ip: text("ip"),
  ua: text("ua"),
  createdAt: text("created_at"),
});

// Favorites
export const favorites = sqliteTable("favorites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  softwareId: integer("software_id").notNull(),
  createdAt: text("created_at"),
});

// Comments
export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  softwareId: integer("software_id").notNull(),
  userId: integer("user_id").notNull(),
  rating: integer("rating"),
  content: text("content"),
  createdAt: text("created_at"),
});

// Admin tokens
export const adminTokens = sqliteTable("admin_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(),
  note: text("note"),
  createdAt: text("created_at"),
});

// Storage backends
export const storageBackends = sqliteTable("storage_backends", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  code: text("code"),
  rootPath: text("root_path"),
  configJson: text("config_json"),
  lastCapacityJson: text("last_capacity_json"),
  lastCapacityAt: text("last_capacity_at"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: text("created_at"),
});

// Software files
export const softwareFiles = sqliteTable("software_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  softwareId: integer("software_id").notNull(),
  label: text("label"),
  backendType: text("backend_type"),
  shareUrl: text("share_url").notNull(),
  filePath: text("file_path"),
  storageBackendId: integer("storage_backend_id"),
  fileSizeBytes: integer("file_size_bytes"),
  isPrimary: integer("is_primary").notNull().default(0),
  createdAt: text("created_at"),
});

// Software sources
export const softwareSources = sqliteTable("software_sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  softwareId: integer("software_id").notNull(),
  sourceType: text("source_type").notNull(),
  configJson: text("config_json").notNull(),
  enabled: integer("enabled").notNull().default(1),
  lastCheckedAt: text("last_checked_at"),
  lastResultJson: text("last_result_json"),
  lastError: text("last_error"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

// Software source logs
export const softwareSourceLogs = sqliteTable("software_source_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceId: integer("source_id").notNull(),
  softwareId: integer("software_id").notNull(),
  previousVersion: text("previous_version"),
  newVersion: text("new_version"),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  rawResultJson: text("raw_result_json"),
  createdAt: text("created_at"),
});

// Software submissions
export const softwareSubmissions = sqliteTable("software_submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  softwareId: integer("software_id"),
  title: text("title").notNull(),
  payloadJson: text("payload_json").notNull(),
  status: text("status").notNull().default("pending"),
  reviewNote: text("review_note"),
  createdAt: text("created_at"),
  reviewedAt: text("reviewed_at"),
});

