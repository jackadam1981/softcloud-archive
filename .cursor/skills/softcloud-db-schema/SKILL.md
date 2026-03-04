---
name: softcloud-db-schema
description: Focuses on designing, reviewing, and evolving the Cloudflare D1 schema for SoftCloud Archive based on db/schema.sql. Use when working on database tables, relations, indexes, and queries for users, software, categories, downloads, favorites, comments, and admin tokens.
---

# SoftCloud D1 Schema Assistant

## Role

- Acts as the **database/data modeling specialist** for SoftCloud Archive。
- 关注 `db/` 目录下的内容，尤其是：
  - `schema.sql`：表结构与关系
  - 未来的迁移脚本（如 `migrations/*.sql`、`seed.sql` 等）

## When to Use This Skill

Use this skill when:

- 讨论或修改 SoftCloud 的数据结构：用户、软件、分类、下载记录、收藏、评论、管理员令牌等。
- 需要为新的业务功能设计表结构或列，例如：
  - 新的统计维度（每日下载量、热门软件榜单）
  - 新的用户功能（收藏夹、评分、评论状态）
  - 后台管理相关字段（上下架状态、审核状态等）
- 想要检查或优化现有 SQL 查询是否与 schema 一致、是否需要索引。

## Core Instructions

1. **以 `schema.sql` 为单一真相源**
   - 所有 D1 相关讨论，均以 `db/schema.sql` 为准。
   - 在提出修改建议前，先阅读当前 schema，理解现有表与外键/关联关系。

2. **围绕核心业务建模**
   - 核心实体：
     - `users`：用户账户信息
     - `categories`：软件分类
     - `software`：软件基本信息（name、slug、version、描述等）
     - `software_categories`：软件与分类多对多关系
     - `downloads`：下载日志
     - `favorites`：用户收藏
     - `comments`：评论/评分
     - `admin_tokens`：后台访问令牌
   - 设计新字段/新表时，优先考虑：
     - 是否符合这些核心实体的职责边界
     - 是否可以通过现有关联推导，而不必重复存储

3. **SQL 风格与约定**
   - 使用小写表名和下划线风格的列名，例如：`created_at`、`user_id`。
   - 主键优先使用 `INTEGER PRIMARY KEY AUTOINCREMENT` 或类似 D1 友好的方式。
   - 外键关系需保持命名清晰，例如：
     - `downloads.user_id` → `users.id`
     - `software_categories.software_id` → `software.id`
   - 添加必要的索引以支持常用查询（按 `slug`、按分类、按用户 ID 等）。

4. **与 Workers API 的协同**

当 schema 改动会影响 Workers API 时：

- 明确列出受影响的接口（例如：`GET /api/software`、`/api/software/:slug/download`）。
- 确保：
  - 新增的字段在 API 层有清晰的读写策略；
  - 删除或重命名字段时，给出迁移兼容方案（例如保留旧字段一段时间，或在代码中做兼容分支）。

5. **迁移与数据安全**

- 任何破坏性变更（删除列、修改列类型）都应通过 **迁移脚本** 明确描述：
  - 包括数据备份/迁移步骤，以及回滚方案。
- 为生产环境考虑：
  - 尽量使用 **向前兼容** 方式演进：先加列、代码支持新列、数据迁移完成后，再移除旧列。

## Design Checklist

在提出或实现 schema 变更前，逐项检查：

- [ ] 这个字段/表是否与现有实体职责一致？
- [ ] 是否存在重复存储，可以通过 JOIN 推导？
- [ ] 是否为常用查询/筛选条件提供了索引？
- [ ] 命名是否清晰、一致（表名、列名、外键）？
- [ ] 是否会影响现有 API？如果是，是否已考虑到 API 的兼容调整？
- [ ] 是否需要迁移脚本和/或回滚方案？

## Examples (High-Level)

- 当用户说「我要支持按评分排序的软件列表」：
  - 检查 `comments` 或评分表中是否已有评分字段。
  - 如果没有，设计评分字段（如 `rating`、`rating_count`）的位置：放在 `software` 里做汇总，还是在 `comments` 里逐条记录后做聚合。
  - 给出相应的索引建议和查询示例。

- 当用户说「想加一个收藏夹功能」：
  - 检查 `favorites` 表结构是否足够表达“收藏夹”概念，或是否需要额外的 `favorite_lists` 表。
  - 把隐含的需求转化为实体关系和字段设计，并确保后续在 Workers API 层易于消费。

