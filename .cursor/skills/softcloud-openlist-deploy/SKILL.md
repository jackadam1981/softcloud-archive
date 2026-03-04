---
name: softcloud-openlist-deploy
description: Focuses on deploying and configuring OpenList with cloud storage and WebDAV for SoftCloud Archive, and defining how its share links and paths are used by the Workers API and database. Use when setting up OpenList, mounting drives, or integrating download links.
---

# SoftCloud OpenList Deployment Assistant

## Role

- Acts as the **OpenList and storage integration specialist** for SoftCloud Archive。
- 负责 OpenList 部署、网盘挂载、WebDAV 配置，以及与 SoftCloud 下载流程的对接约定。

## When to Use This Skill

Use this skill when:

- 部署或调整 OpenList 服务。
- 挂载/管理各类网盘（阿里云盘、OneDrive、天翼云盘等）。
- 启用或配置 WebDAV，并规划目录结构。
- 决定如何在 SoftCloud 数据库中保存 OpenList 的链接与路径。

## Core Instructions

1. **OpenList 部署方式**
   - 可通过一键部署（如 1Panel/Docker 等）在云主机或其它环境安装 OpenList。
   - 确保为 OpenList 配置独立域名，例如：
     - `pan.example.com`

2. **网盘挂载与目录规划**
   - 在 OpenList 中挂载所需网盘（阿里云盘、OneDrive、天翼云盘等）。
   - 规划统一的目录结构，例如：
     - `/software/windows/`
     - `/software/macos/`
     - `/software/android/`
   - 便于后续在后台或 WebDAV 客户端定位和维护软件安装包。

3. **WebDAV 配置**
   - 启用 WebDAV 功能，设定仅管理员使用的账号与密码。
   - 记录 WebDAV 访问地址（如 `https://pan.example.com/dav`）以及对应的认证方式。
   - 管理员通过 WebDAV 客户端上传/调整文件。

4. **分享链接与 SoftCloud 对接**
   - 在 OpenList 后台中，对上传好的文件/目录生成分享链接。
   - 在 SoftCloud 后台管理接口中（例如 `/api/admin/software`）保存：
     - `openlist_share_url`：公开分享链接，用于用户下载时重定向。
     - `openlist_file_path`：在 OpenList 内部的文件路径，用于后续维护或迁移。
   - Workers 下载接口 (`/api/software/:slug/download`) 的标准流程：
     1. 根据 `slug` 查询对应记录。
     2. 选择使用 `openlist_share_url` 作为 302 重定向目标。
     3. 在 D1 `downloads` 表中记录一条下载日志。

5. **安全与配额考虑**
   - 对公开分享链接的权限进行评估：
     - 是否允许匿名访问、是否有过期时间、是否可以限速/限频。
   - 对后台 WebDAV 账户严格保护：
     - 使用强密码、只在可信环境下使用。

## Integration Checklist

在完成一次 OpenList 相关配置或对接前，逐项检查：

- [ ] OpenList 服务已在目标环境中成功部署，并可通过域名访问？
- [ ] 所需网盘均已正确挂载，目录结构清晰可维护？
- [ ] WebDAV 已启用，并记录了访问地址与认证信息（仅管理员知道）？
- [ ] SoftCloud 的后台 API 已能正确录入 `openlist_share_url` 与 `openlist_file_path`？
- [ ] `/api/software/:slug/download` 能成功记录下载日志并重定向到正确的 OpenList 分享链接？

