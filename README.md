# 子衿博客

> 基于 Astro + React + Tailwind CSS 构建的个人博客，带完整后台管理

![Astro](https://img.shields.io/badge/Astro-6.x-FF5D01?logo=astro&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-3.x-88CE02?logo=greensock&logoColor=white)

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Astro 6 + React 19 |
| 样式 | Tailwind CSS 4 |
| 动画 | GSAP 3 |
| 图标 | Lucide React |
| 图床 | ImgBB |
| 部署 | Docker + Node standalone |

## 项目结构

```
├── public/                  # 静态资源
├── src/
│   ├── components/          # React 组件
│   ├── content/             # 内容集合配置
│   ├── layouts/             # 页面布局
│   ├── lib/                 # 工具函数
│   ├── pages/               # 路由页面（含 API）
│   │   ├── admin/           #   后台管理页面
│   │   ├── api/             #   服务端 API
│   │   └── ...              #   前台页面
│   ├── scripts/             # 客户端脚本
│   └── styles/              # 全局样式
├── astro.config.mjs         # Astro 配置
├── components.json          # shadcn/ui 配置
├── package.json
└── tsconfig.json
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview
```

开发服务器默认跑在 `http://localhost:4321`，后台在 `http://localhost:4321/admin`。

## 功能

### 前台

- 首页：Hero 区域 + 文章/项目/图库概览
- 文章：Markdown 渲染、目录导航、代码高亮
- 项目：作品展示卡片
- 图库：瀑布流相册，按来源分类筛选
- 关于：个人信息展示
- 响应式设计 + 深色模式
- GSAP 页面过渡与微交互动画

### 后台

- 登录认证：基于 HttpOnly Cookie 的会话管理（SameSite=Strict，按请求协议决定 Secure）
- 首页管理：Hero 文案与展示内容编辑
- 文章管理：Markdown 编辑器 + LLM 润色
- 项目管理：封面图上传（ImgBB 图床）
- 图库管理：批量上传、URL 导入、拖拽排序
- 关于管理：头像与个人信息编辑

## 图床配置

图片上传使用 [ImgBB](https://imgbb.com/)，API Key 写入环境变量：

```bash
IMGBB_API_KEY="your-api-key"
```

格式支持 JPG、PNG、GIF、WebP、BMP、TIFF，单张最大 32MB。

## 数据库配置

后台内容和 RAG 索引统一存在 SQLite + sqlite-vec 里。数据库路径只有一个环境变量：

```bash
SQLITE_DB_PATH="./data/blog.sqlite"
```

生成站内 RAG 索引：

```bash
npm run rag:index
```

## API Key 配置

所有服务端密钥从 `.env` 读取，`.env.example` 提供完整模板：

```bash
AI_GATEWAY_API_KEY="your-ai-gateway-key"
AI_CHAT_MODEL="openai/gpt-4o-mini"
AI_CHAT_TEMPERATURE="0.7"
AI_EMBEDDING_MODEL="openai/text-embedding-3-small"
AI_EMBEDDING_DIMENSIONS="1536"
AI_RERANK_MODEL="cohere/rerank-v3.5"

LLM_API_KEY="your-openai-compatible-key"
IMGBB_API_KEY="your-imgbb-key"
GITHUB_TOKEN="optional-github-token"
```

## 后台认证配置

后台必须在 `.env` 中显式设置 `ADMIN_SECRET`（会话 JWT 签名密钥），缺失或留空时后台认证直接报错拒绝工作（登录接口与服务日志会给出待添加的 `.env` 行）。生成随机密钥：

```bash
node -e "console.log(crypto.randomBytes(48).toString('base64url'))"
```

把命令输出的随机串粘贴到 `.env` 中：

```bash
ADMIN_SECRET="<把上面命令输出的随机串粘贴到这里>"
```

同时设置 `ADMIN_USERNAME`（可选，默认 `admin`）和强密码 `ADMIN_PASSWORD`（必填，没有默认值）。


## Docker 部署

使用 Node 22 的多阶段镜像，在容器内构建 Astro standalone 服务，由 Nginx 提供反向代理。SQLite 原生模块在 Linux 中安装，运行镜像仅保留生产依赖，不需要额外的数据库服务。

首次部署先从 `.env.example` 复制出 `.env`（已有文件时沿用），设置 `ADMIN_USERNAME`、`ADMIN_PASSWORD` 及需要的 AI 密钥。Compose 将 `.env` 可写挂载到容器，后台保存 AI 设置会同步修改这个文件；每次启动都会重新读取它。密钥、现有数据库和上传图片均不会打包进镜像。

Linux 主机准备持久化目录，并允许容器的 `node` 用户（UID/GID 1000）读写：

```bash
mkdir -p data public/uploads
sudo chown -R 1000:1000 data public/uploads
sudo chown 1000:1000 .env
chmod 600 .env
```

Windows / Docker Desktop 可直接使用本地目录挂载，无需执行上述 Linux 权限命令。

```bash
# 构建并启动（需要 Docker 引擎运行）
docker compose up -d --build

# 查看运行状态和日志
docker compose ps
docker compose logs -f blog

# 重启服务，重新加载 .env
docker compose restart blog

# 停止服务，宿主机数据仍保留
docker compose down
```

访问 `http://localhost`，后台地址为 `http://localhost/admin`。Nginx 映射宿主机的 `80` 端口，并通过 Compose 内部网络转发到 `blog:4321`；博客容器不直接映射宿主机端口。需要其他入口端口时修改 Nginx 服务的 `ports` 左侧，例如 `8080:80`。

`nginx.conf` 支持最大 40 MB 的请求（应用仍限制单张图片为 32 MB），关闭代理缓冲以支持 AI 流式回复。当前配置提供 HTTP；启用 HTTPS 时需要另行准备域名证书及 Nginx 的 443 监听配置。使用域名访问时，还需确保域名包含在 `astro.config.mjs` 的 `allowedHosts` 中，修改后重新构建镜像。

```bash
# 修改 Nginx 配置后，先验证再重新加载
docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload
```

Nginx 在博客健康检查通过后启动；单独重建博客容器后，可用 `docker compose restart nginx` 重新解析博客容器的地址。

| 宿主机路径 | 容器路径 | 用途 |
|------|------|------|
| `./data` | `/app/data` | SQLite 数据库及 WAL/SHM 文件 |
| `./public/uploads` | `/app/dist/client/uploads` | 上传图片，同时由 Astro 静态服务提供访问 |
| `./.env` | `/app/.env` | 管理员认证、AI 配置及后台设置持久化 |

容器固定使用 `/app/data/blog.sqlite` 和 `/app/dist/client/uploads`，覆盖 `.env` 中的 `SQLITE_DB_PATH` 和 `UPLOAD_DIR`。如需沿用其他位置的数据，调整 Compose 的挂载源路径。备份时应同时保存数据库目录、图片目录和 `.env`；建议先停止服务再复制数据库目录。

镜像通过 `/favicon.svg` 做健康检查，只检查 HTTP 服务是否响应。它以非 root 用户运行；Linux 上遇到写入权限错误时，检查上述三个挂载源的属主和权限。

## Gitea 与 CI

主 `docker-compose.yml` 同时部署 Gitea 28.0.0，使用独立 SQLite 和 `gitea-data` 命名卷保存仓库、配置、用户及实例密钥。博客继续使用 `www.zijin.online`；Nginx 将 `git.zijin.online` 转发到 Gitea。Runner 3.3.0 在另一台 Linux CI 主机上运行，仅连接该主机的 Docker 引擎。

### 初始化 Gitea

1. 将 `git.zijin.online` 的 DNS A/AAAA 记录指向部署主机；只配置主机实际支持的地址。
2. 执行 `docker compose up -d --build`，打开 `http://git.zijin.online`，完成安装向导并创建管理员。数据库选择 SQLite3，路径沿用 `/data/gitea/gitea.db`。
3. 新建或迁移博客仓库，在仓库设置中开启 **Actions**。实例级 Actions 已启用，但仓库需要单独开启。
4. 提交 `.gitea/workflows/ci.yml`、`Dockerfile`、`.dockerignore` 以及 `ci/` 下的配置文件；注册 Runner 后即可运行工作流。

Gitea 的公开注册已关闭，后续账号由管理员创建。SSH Git 入口为 `git.zijin.online:2222`，例如 `ssh://git@git.zijin.online:2222/<owner>/<repo>.git`，需放行对应端口。首次安装应在管理员完成初始化前限制外部访问。

当前 Gitea 地址为 HTTP；公网使用前应配置 HTTPS。启用 HTTPS 时同时更新 Gitea 的 `GITEA__server__ROOT_URL` 为 `https://git.zijin.online/`、Nginx 证书配置及 CI 主机的 `GITEA_INSTANCE_URL`，保持 TLS 校验开启。Runner 和任务容器必须都能访问该地址，不能使用 `localhost` 代替。

仅更新或启动 Gitea 可执行 `docker compose up -d gitea nginx`（Nginx 也会启动其依赖的博客服务）。健康状态查看 `docker compose ps`，日志查看 `docker compose logs -f gitea`。Gitea 数据保存在命名卷中，停机备份时同时保存该卷；不要使用 `docker compose down -v` 移除数据卷。

### 独立 CI 主机接入

CI 主机需安装兼容 Docker 29 CLI 的 Docker Engine，并能访问 Gitea、Docker Hub、docker.gitea.com、Debian 软件源、npm Registry 和 GitHub（用于拉取 `actions/checkout@v4`）。将 `ci/` 中的四个配置文件复制到该主机同一目录：

- `Dockerfile`：提供 Node 22、Git、Docker CLI 和 Buildx。
- `Dockerfile.dockerignore`：排除任务工具镜像构建上下文中的所有本地文件。
- `docker-compose.runner.yml`：Runner 服务、持久化卷和注册 token 文件挂载。
- `runner-config.yml`：单任务并发、任务超时及 Docker 执行配置。

在此目录先构建任务镜像：

```bash
docker build -t blog-ci:local -f Dockerfile .
```

在 Gitea 博客仓库的 **设置 → Actions → Runners** 中获取仓库级注册 token，通过文本编辑器将它保存为 CI 主机当前目录下的 `runner-token.txt`，并执行 `chmod 600 runner-token.txt`。不要将 token 提交到仓库；项目已忽略 `ci/runner-token.txt`，镜像构建上下文也排除了整个 `ci/`。

```bash
# 首次启动自动注册，之后复用 runner-data 卷中的注册信息
docker compose -f docker-compose.runner.yml up -d
docker compose -f docker-compose.runner.yml logs -f runner
```

默认实例地址为 `http://git.zijin.online/`。需要调整时，在 CI 主机目录的 `.env` 中设置 `GITEA_INSTANCE_URL`，然后重建 Runner 容器。这个 `.env` 属于 CI 主机，不能复制博客的密钥配置。

Runner 应以 `blog-ci` 标签上线，工作流使用相同的 `runs-on` 标签。注册 token 来自文件挂载，不写在 Compose 中；`runner-data` 中的 `.runner` 同样包含凭据，需保护和备份。独立 CI 主机运行的任务可访问其 Docker socket，因此应使用仓库级 Runner，只执行可信仓库代码；不要让该主机持有博客生产数据或部署凭据。

### 已实现的 CI 与后续集成选项

工作流在 **push、pull request、手动触发** 时运行，先构建 Dockerfile 的 `test` 阶段执行 `npm test`，再构建 `runtime` 阶段执行 Astro 生产构建，并验证 `better-sqlite3` 与 `sqlite-vec` 可以加载。镜像仅保留在 CI 主机，以提交 SHA 标记，不推送镜像仓库、不更新线上博客。

| 选项 | 功能与接入方式 | 状态 / 建议 |
|------|------|------|
| 测试、生产构建与原生依赖检查 | 每次提交和 PR 执行 Linux 容器构建 | 已提供工作流，需注册 Runner |
| 分支保护 | 在 Gitea 设置中要求 CI 通过后才允许合并主分支 | 建议在首轮 CI 成功后开启 |
| Docker 镜像发布 | 主分支或版本标签构建后推送到 Gitea Container Registry，以 SHA/版本号标记 | 下一步建议；配置 Registry 凭据与 HTTPS |
| 手动部署 | 通过手动工作流选择镜像版本，经 SSH 在部署主机更新博客并重启 Nginx | 推荐首个 CD 方案；需确定 SSH 账号、目录和凭据 |
| 主分支自动部署 | 仅可信主分支 CI 通过后发布并部署，PR 只做 CI | 手动部署稳定后接入 |
| 健康验证与回滚 | 部署后验证 HTTP、后台和上传；失败时恢复之前的镜像版本 | 与 CD 一起实现；数据库恢复需另行设计 |
| 备份 | 定时备份博客数据库、上传、配置以及 Gitea 数据卷 | 需确定保存位置、保留天数及恢复流程 |
| 通知 | 构建失败或部署结果通过 Webhook 通知飞书、邮件等 | 需选择渠道；凭据放 Gitea Actions Secrets |
| 缓存与清理 | 复用 Docker 构建缓存，定期按保留策略清理 CI 镜像 | 当前可复用 Docker 本地层缓存；需确定磁盘保留策略 |
| 依赖与镜像扫描 | 定时检查 npm 依赖、容器漏洞及版本升级 | 可后续引入扫描工具及阻断标准 |

本项目暂无独立 lint/typecheck 命令，未将它们作为现有 CI 检查。新工具需明确规则及通过标准后再接入。仓库使用 SQLite，无需给工作流另外启动数据库服务；CI 不读取博客 `.env`，也不调用真实 AI API。

参考：[Gitea Docker 安装](https://docs.gitea.com/installation/install-with-docker)、[Actions 快速开始](https://docs.gitea.com/usage/actions/quickstart)、[Runner Docker 安装](https://docs.gitea.com/runner/installation/docker/)。

## 许可证

MIT
