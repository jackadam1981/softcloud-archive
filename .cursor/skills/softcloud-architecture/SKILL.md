---
name: softcloud-architecture
description: Defines architectural principles, boundaries, and high-level design decisions for the SoftCloud Archive project including frontend, Workers API, D1, and OpenList integration. Use when making cross-cutting design decisions, planning new features, or refactoring core structure.
---

# SoftCloud Architecture Assistant

## Role

- Acts as the **system architect** for SoftCloud Archive。
- 负责整体架构与边界划分，而不是具体编码细节。

## When to Use This Skill

Use this skill when:

- 设计新功能，需要决定：放在前端、Workers、数据库哪一层。
- 调整目录结构、模块划分或公共组件设计。
- 讨论性能、可扩展性、安全性、可维护性等非功能性需求。
- 规划“从 0 到 1”的整体实现路线或“从开发到上线”的步骤。

## Core Architectural Principles

1. **清晰的分层**
   - **前端（Next.js/React，`frontend/`）**
     - 负责展示、交互、路由（页面级）、Session 状态管理。
     - 不直接操作数据库，只通过 Workers API 获取/提交数据。
   - **后端（Cloudflare Workers，`workers/`）**
     - 负责业务逻辑、权限控制、数据聚合。
     - 暴露稳定的 REST 风格 `/api/...` 接口，返回 JSON。
   - **数据库（Cloudflare D1，`db/`）**
     - 负责结构化数据存储与约束。
     - 通过 `schema.sql` 定义单一真相源。
   - **文件存储（OpenList + 网盘 + WebDAV）**
     - 只存放大文件（安装包），Workers 仅持久化其链接与元数据。

2. **API 合约优先**
   - 在实现前端/后端具体代码前，先稳定 API 设计：
     - 路径、方法、请求体、响应体、错误码。
   - 所有客户端（前端、管理工具）只依赖公开 API，而不依赖内部实现细节。

3. **配置与密钥分离**
   - 所有密钥、令牌、重要配置必须由：
     - `wrangler.toml` 绑定
     - Cloudflare Dashboard 环境变量
   - 代码库中只保留“名称约定”，不提交实际值。

4. **渐进式演进**
   - 新功能尽量通过 **向前兼容** 的方式加入，不破坏现有接口/数据：
     - API 增加字段而不是直接变更语义。
     - 数据库通过新增列/表 + 迁移脚本。

5. **可观测性与调试**
   - 后端接口应提供清晰的错误码与日志点，便于前端与运维排查问题。
   - 对关键路径（登录、下载）要有明确的日志策略。

## Design Checklist

在做架构决策或大改动前，逐项检查：

- [ ] 是否清晰地区分了前端/后端/数据库/文件存储的职责？
- [ ] 是否定义了清晰的 API 合约（路径、参数、响应结构、错误码）？
- [ ] 是否避免在前端直接耦合数据库或 OpenList 的内部细节？
- [ ] 是否考虑了安全性（认证、授权、敏感信息隐藏）？
- [ ] 是否提供了演进路径（迁移策略、兼容旧数据/旧客户端）？
- [ ] 是否记录或总结了关键设计决策，方便后续参考？

