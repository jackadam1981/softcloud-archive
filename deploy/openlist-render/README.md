# OpenList 一键部署到 Render（备选）

本目录提供在 [Render](https://render.com) 上一键部署 [OpenList](https://github.com/OpenListTeam/OpenList) 的 Blueprint 模板。**若不想绑卡，推荐优先使用 [Railway 一键部署](https://railway.com/deploy/openlist)**（新用户 $5 试用、无需信用卡）。步骤与 [linux.do 教程：render部署最新版openlist](https://linux.do/t/topic/1031701) 对齐。

## 为何使用社区镜像

- **OpenList v4.1.0 及以后**：官方镜像在 Render 上可能报错「当前用户没有 ./data 目录（/opt/openlist/data）的写和/或执行权限」，需自行构建或使用针对 PaaS 的镜像。
- 本模板采用社区镜像 **`ghcr.io/lsc0223/openlist-for-paas:main`**（见 [教程评论区](https://linux.do/t/topic/1031701)），可直接在 Render 上使用，环境变量按需配置即可。
- **v4.1.0 以前**：若使用官方镜像 `openlistteam/openlist:latest`，需配置 `DB_*`、`UMASK=022` 等；v4.1.0+ 已移除 `PUID`/`PGID`，无需再设。

## 使用方法

### 方式一：一键部署（推荐）

**直接使用本仓库**（仓库根目录已包含 `render.yaml`）：

1. 打开：`https://render.com/deploy?repo=https://github.com/jackadam1981/softcloud-archive`
2. 按提示登录 Render、确认服务配置后创建。镜像为 `ghcr.io/lsc0223/openlist-for-paas:main`，会自动挂载持久化磁盘 `/opt/openlist/data`。

若你 Fork 了本仓库，将上述 URL 中的仓库地址改为你的 Fork 地址即可。

### 方式二：在 Render 控制台手动创建

1. 登录 [Render Dashboard](https://dashboard.render.com/) → **New** → **Web Service**。
2. 选择 **Deploy an existing image from a registry**。
3. **Image URL** 填写：`ghcr.io/lsc0223/openlist-for-paas:main`（PaaS 友好；若坚持用官方镜像可选 `openlistteam/openlist:latest-lite`，v4.1.0+ 可能需自建镜像解决权限）。
4. **Instance Type** 选 Starter（免费档约 15 分钟无请求后休眠，Starter 可常驻）。
5. 添加 **Disk**：Mount Path 填 `/opt/openlist/data`，容量至少 1GB。
6. 环境变量：`PORT` = `5244`（Render 通常会自动注入）；若使用外置 Postgres/MySQL，按 [教程](https://linux.do/t/topic/1031701) 设置 `DB_TYPE`、`DB_HOST`、`DB_NAME`、`DB_USER`、`DB_PASS`、`DB_PORT`、`DB_SSL_MODE`、`DB_TABLE_PREFIX`、`UMASK=022`。
7. 创建后访问 `https://你的服务名.onrender.com`，首次进入按向导完成初始化（设置管理员密码、挂载网盘等）。

## 参考

- [linux.do：render部署最新版openlist教程](https://linux.do/t/topic/1031701)（v4.1.0 前后差异、自建镜像与 Actions、公共镜像说明）
- [OpenList 官方 Docker 文档](https://doc.openlist.team/guide/installation/docker)、[PaaS 文档](https://doc.openlist.team/guide/installation/paas)
