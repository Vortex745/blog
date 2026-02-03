# 📝 个人博客系统

<p align="center">
  <img src="public/logo.png" alt="Logo" width="120" height="120" />
</p>

<p align="center">
  <strong>基于 Next.js 16 + Neon PostgreSQL 构建的现代化全栈博客应用</strong>
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#技术栈">技术栈</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#项目结构">项目结构</a> •
  <a href="#部署">部署</a>
</p>

---

## ✨ 功能特性

### 🔐 用户系统
- 用户注册 / 登录
- JWT Token 认证
- 路由守卫保护
- 管理员权限控制

### 📄 内容管理
- **笔记 (Notes)** - Markdown 格式的技术笔记
- **项目 (Projects)** - 独立的项目展示模块
- **踩坑记录 (Pitfalls)** - 结构化的问题解决记录
- **关于 (About)** - 个人简介页面

### 🎨 现代化 UI
- 响应式设计，支持移动端
- Framer Motion 动画效果
- Glassmorphism 玻璃拟态风格
- 深色/浅色主题适配
- DaisyUI + TailwindCSS 组件库

### 📦 其他功能
- 文章分类与标签系统
- 评论功能
- 时光机（归档页面）
- 图片上传与压缩
- 阅读进度指示器

---

## 🛠️ 技术栈

### 后端
| 技术 | 说明 |
|------|------|
| **Next.js 16** | App Router + API Routes |
| **Neon** | Serverless PostgreSQL 数据库 |
| **Prisma 5** | ORM 和数据库迁移 |
| **JWT** | 用户认证 |
| **bcrypt** | 密码加密 |
| **Zod** | 数据验证 |

### 前端
| 技术 | 说明 |
|------|------|
| **React 19** | UI 框架 |
| **TypeScript** | 类型安全 |
| **TailwindCSS 3** | 原子化 CSS |
| **DaisyUI** | UI 组件库 |
| **Framer Motion** | 动画库 |
| **Lucide React** | 图标库 |
| **React Markdown** | Markdown 渲染 |

---

## 📁 项目结构

```
blog/
├── prisma/
│   ├── schema.prisma          # 数据库模型定义
│   ├── migrations/            # 数据库迁移文件
│   └── seed.ts                # 初始数据填充
├── public/
│   └── logo.png               # 网站 Logo
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API 路由
│   │   │   ├── auth/          # 认证接口 (login, register)
│   │   │   ├── posts/         # 文章接口
│   │   │   ├── projects/      # 项目接口
│   │   │   ├── categories/    # 分类接口
│   │   │   ├── tags/          # 标签接口
│   │   │   ├── comments/      # 评论接口
│   │   │   └── about/         # 关于页接口
│   │   ├── notes/             # 笔记列表页
│   │   ├── post/[id]/         # 文章详情页
│   │   ├── projects/          # 项目列表页
│   │   ├── pitfalls/          # 踩坑记录页
│   │   ├── archive/           # 归档页面
│   │   ├── about/             # 关于页面
│   │   ├── write/             # 写文章页
│   │   ├── write-project/     # 写项目页
│   │   ├── profile/           # 个人中心
│   │   ├── login/             # 登录页
│   │   └── register/          # 注册页
│   ├── components/            # React 组件
│   │   ├── Navbar.tsx         # 导航栏
│   │   ├── Footer.tsx         # 页脚
│   │   ├── CommentsSection.tsx # 评论组件
│   │   ├── ImageUploader.tsx  # 图片上传组件
│   │   ├── ProtectedRoute.tsx # 路由守卫
│   │   └── ui/                # UI 基础组件
│   ├── context/
│   │   └── AuthContext.tsx    # 认证状态管理
│   └── lib/
│       ├── prisma.ts          # Prisma Client 单例
│       ├── auth.ts            # JWT 认证工具
│       ├── axios.ts           # Axios 实例配置
│       └── permissions.ts     # 权限校验工具
├── .env                       # 环境变量 (不提交到 Git)
├── tailwind.config.js         # TailwindCSS 配置
└── package.json               # 项目依赖
```

---

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/Vortex745/blog.git
cd blog
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env` 文件：

```env
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
JWT_SECRET="your-super-secret-jwt-key"
```

### 4. 初始化数据库

```bash
# 生成 Prisma Client
npx prisma generate

# 运行数据库迁移
npm run db:init

# (可选) 填充初始数据
npm run db:seed
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

---

## 📡 API 接口

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |

### 文章
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/posts` | 获取文章列表 (支持 `?type=note/pitfall`) |
| POST | `/api/posts` | 创建文章 |
| GET | `/api/posts/:id` | 获取文章详情 |
| PUT | `/api/posts/:id` | 更新文章 |
| DELETE | `/api/posts/:id` | 删除文章 |

### 项目
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/projects` | 获取项目列表 |
| POST | `/api/projects` | 创建项目 |
| GET | `/api/projects/:id` | 获取项目详情 |
| PUT | `/api/projects/:id` | 更新项目 |
| DELETE | `/api/projects/:id` | 删除项目 |

### 其他
| 方法 | 路径 | 说明 |
|------|------|------|
| GET/PUT | `/api/about` | 获取/更新关于页 |
| GET/POST | `/api/categories` | 分类管理 |
| GET/POST | `/api/tags` | 标签管理 |
| GET/POST/DELETE | `/api/comments` | 评论管理 |

---

## 🗄️ 数据库模型

| 模型 | 字段 |
|------|------|
| **User** | id, username, email, password, avatar, tagline, role |
| **Post** | id, userId, title, content, summary, cover, status, type, views |
| **Project** | id, userId, title, description, techStack, repoUrl, demoUrl, cover, isPinned |
| **Category** | id, name |
| **Tag** | id, name |
| **Comment** | id, postId, userId, content |
| **About** | id, userId, content |

---

## 🌐 部署

### Vercel (推荐)

1. Fork 或 Clone 此仓库到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量：
   - `DATABASE_URL` - Neon 数据库连接串
   - `JWT_SECRET` - JWT 密钥
4. 点击 Deploy

### 环境变量说明

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 数据库连接串 |
| `JWT_SECRET` | ✅ | JWT 签名密钥 (生产环境使用强随机值) |

---

## 📜 开发命令

```bash
npm run dev       # 启动开发服务器
npm run build     # 构建生产版本
npm start         # 启动生产服务器
npm run lint      # 代码检查
npm run db:init   # 数据库迁移
npm run db:seed   # 填充数据
```

---

## 📄 License

MIT © 2024

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Vortex745">Vortex745</a>
</p>
