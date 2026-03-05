# 05-05 存储后端与 OpenList

> 阶段 5：多存储后端抽象、软件-文件关联、OpenList 路径约定。

---

## 目标与范围

- 存储后端（storage_backends）管理：多网盘/挂载点抽象
- 软件-文件关联（software_files）：一个软件对应多个物理文件，主文件标记 is_primary
- 下载时优先从 software_files 取主文件 share_url，否则回退 software.openlist_share_url
- 后台 UI：存储后端列表、软件详情中的文件列表

---

## 依赖

- 阶段 1～4 已完成
- OpenList 已部署，可生成分享链接

---

## 任务清单

### 数据库

- [ ] `storage_backends` 表：name, type, code, root_path, is_active, last_capacity_json 等
- [ ] `software_files` 表：software_id, storage_backend_id, file_path, share_url, is_primary 等

### Workers API

- [ ] `GET /api/admin/storage-backends` — 列表
- [ ] `POST /api/admin/storage-backends` — 创建
- [ ] `PUT /api/admin/storage-backends/:id` — 更新
- [ ] `GET /api/admin/software/:id/files` — 软件关联的文件列表
- [ ] （可选）`POST /api/admin/software/:id/files`、`DELETE /api/admin/software/:id/files/:fileId` — 添加/移除文件

### OpenList 约定

- [ ] 根路径按 backend 区分：如 `/aliyun-main/`、`/onedrive-free/`
- [ ] 软件目录建议：`soft/windows/`、`soft/mac/`、`soft/linux/`
- [ ] 批量导入目录前缀：如 `/aliyun-main/import/`

### 前端

- [ ] 存储后端管理页面：列表、创建
- [ ] 软件详情页展示关联文件列表

---

## 关键文件

| 文件 | 说明 |
|------|------|
| `db/schema.sql` | storage_backends、software_files |
| `workers/src/index.ts` | storage-backends、files 路由 |
| [08-OpenList集成](./08-OpenList集成.md) | OpenList 使用说明 |

---

## 验收标准

- 可配置多个存储后端
- 软件可关联多个文件，下载时正确取主文件链接
- 后台可查看存储后端与软件文件列表

---

## 相关文档

- [08-OpenList集成](./08-OpenList集成.md)
- [03-架构与开发顺序](./03-架构与开发顺序.md)
