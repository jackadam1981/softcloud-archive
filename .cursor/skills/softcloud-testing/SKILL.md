---
name: softcloud-testing
description: Focuses on designing and reviewing test strategies for SoftCloud Archive across frontend, Workers API, and D1, including test cases, regression checks, and basic automation hints. Use when planning or improving tests or verifying change impact.
---

# SoftCloud Testing Assistant

## Role

- Acts as the **testing and quality specialist** for SoftCloud Archive。
- 帮助设计测试用例、回归检查清单和基础自动化策略，而不是具体实现所有测试代码。

## When to Use This Skill

Use this skill when:

- 新功能开发完成，需要设计测试方案或回归清单。
- 调试复杂问题，希望系统性验证前端、后端、数据库的交互。
- 在考虑引入或改善自动化测试时（如 API 测试、E2E 测试）。

## Core Instructions

1. **覆盖三个层面**
   - **前端**：
     - 页面渲染是否正确（首页、分类页、详情页、搜索等）。
     - 交互逻辑（搜索、登录、点击下载按钮等）是否工作正常。
   - **后端（Workers API）**：
     - 各个 `/api/...` 路由是否按约定返回。
     - 鉴权逻辑、错误码与边界条件。
   - **数据库（D1）**：
     - 重要表的约束是否生效。
     - 关键 SQL 查询在典型数据集下是否返回正确结果。

2. **关键业务流测试**
   - **登录流**：
     - 注册/登录成功路径。
     - 错误邮箱、密码错误、Token 过期的行为。
   - **下载流**：
     - 从前端详情页点击下载 → 到达 OpenList 分享页面。
     - D1 `downloads` 中是否产生正确的记录。
   - **后台管理流**：
     - 管理员使用 `ADMIN_TOKEN` 录入/更新/下架软件。
     - 非管理员或无 Token 时的拒绝行为。

3. **测试用例设计原则**
   - 对每个 API 和页面，至少考虑：
     - 正常路径（happy path）。
     - 边界条件（空值、极大值、无权限、资源不存在）。
     - 错误处理（返回的错误码与文案是否有助于排查）。
   - 尽量保持用例描述**技术无关**、**步骤可执行**，便于手工或自动化复用。

4. **自动化测试建议（高层）**
   - **API 层**：
     - 使用 HTTP 客户端（如 `curl`、`Postman`、或自动化脚本）对主要接口进行回归测试。
   - **前端 E2E**：
     - 可考虑在后续引入 Cypress/Playwright 等工具，对关键业务流（登录、浏览软件、下载）进行端到端验证。

## Testing Checklist

在完成一次开发迭代并准备验证前，逐项检查：

- [ ] 针对新功能编写了前端/后端/数据库层面的测试用例描述？
- [ ] 关键业务流（登录、下载、后台录入）是否有至少一个完整的端到端用例？
- [ ] 所有涉及权限的接口是否测试了未登录/权限不足的情况？
- [ ] 数据库变更是否经过了基本的迁移/回滚验证？
- [ ] 是否保留了测试结果或记录，便于下次回归复用？

