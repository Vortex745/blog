# Blog 项目

基于 Next.js + Neon (PostgreSQL) 构建的全栈博客应用。

## 技术栈

### 后端
- **Next.js 16** - App Router + API Routes
- **Neon** - Serverless PostgreSQL 数据库
- **Prisma 5** - ORM 和数据库迁移
- **JWT** - 用户认证
- **bcrypt** - 密码加密
- **Zod** - 数据验证

### 前端
- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Axios** - HTTP 客户端
- **React Markdown** - Markdown 渲染
- **Lucide React** - 图标库

## 功能特性

### 用户系统
- ✅ 用户注册/登录
- ✅ JWT Token 认证
- ✅ 路由守卫 (ProtectedRoute)
- ✅ 全局状态管理 (AuthContext)

### 文章管理
- ✅ 发布文章 (支持 Markdown)
- ✅ 文章列表 (分页、搜索、分类筛选)
- ✅ 文章详情 (浏览计数)
- ✅ 编辑/删除文章 (作者权限校验)
- ✅ 草稿/发布状态

### 分类与标签
- ✅ 创建/编辑/删除分类
- ✅ 创建/编辑/删除标签
- ✅ 文章关联分类和标签

### 评论系统
- ✅ 发表评论
- ✅ 查看文章评论
- ✅ 删除评论 (评论作者或文章作者)

## 项目结构

```
e:/blog/
├── prisma/
│   ├── schema.prisma          # 数据库模型定义
│   ├── migrations/            # 数据库迁移文件
│   └── seed.ts                # 初始数据填充
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API 路由
│   │   │   ├── auth/          # 认证接口
│   │   │   ├── posts/         # 文章接口
│   │   │   ├── categories/    # 分类接口
│   │   │   ├── tags/          # 标签接口
│   │   │   └── comments/      # 评论接口
│   │   ├── post/[id]/         # 文章详情页
│   │   ├── write/             # 写文章页
│   │   ├── profile/           # 个人中心
│   │   ├── login/             # 登录页
│   │   └── register/          # 注册页
│   ├── components/            # React 组件
│   │   ├── Navbar.tsx         # 导航栏
│   │   └── ProtectedRoute.tsx # 路由守卫
│   ├── context/               # React Context
│   │   └── AuthContext.tsx    # 认证状态管理
│   ├── lib/                   # 工具库
│   │   ├── prisma.ts          # Prisma Client 单例
│   │   ├── auth.ts            # JWT 认证工具
│   │   └── axios.ts           # Axios 实例配置
│   ├── config/                # 配置文件
│   ├── controllers/           # 控制器 (示例)
│   └── middleware/            # 中间件 (示例)
├── .env                       # 环境变量
├── package.json               # 项目依赖
└── tsconfig.json              # TypeScript 配置
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件并配置数据库连接：

```env
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
JWT_SECRET="your-super-secret-jwt-key"
```

### 3. 初始化数据库

```bash
# 生成 Prisma Client
npx prisma generate

# 运行数据库迁移
npm run db:init

# (可选) 填充初始数据
npm run db:seed
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## API 接口文档

### 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |

### 文章接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/posts` | 获取文章列表 (支持分页、搜索、分类筛选) |
| POST | `/api/posts` | 创建文章 (需登录) |
| GET | `/api/posts/:id` | 获取文章详情 |
| PUT | `/api/posts/:id` | 更新文章 (需作者权限) |
| DELETE | `/api/posts/:id` | 删除文章 (需作者权限) |

### 分类接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/categories` | 获取分类列表 |
| POST | `/api/categories` | 创建分类 (需登录) |
| PUT | `/api/categories/:id` | 更新分类 (需登录) |
| DELETE | `/api/categories/:id` | 删除分类 (需登录) |

### 标签接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tags` | 获取标签列表 |
| POST | `/api/tags` | 创建标签 (需登录) |
| PUT | `/api/tags/:id` | 更新标签 (需登录) |
| DELETE | `/api/tags/:id` | 删除标签 (需登录) |

### 评论接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/comments?post_id=xxx` | 获取文章评论 |
| POST | `/api/comments` | 发表评论 (需登录) |
| DELETE | `/api/comments/:id` | 删除评论 (需作者或文章作者权限) |

## 数据库模型

### User (用户)
- id, username, email, password, avatar, createdAt

### Post (文章)
- id, userId, title, content, summary, cover, status, views, createdAt, updatedAt

### Category (分类)
- id, name, createdAt

### Tag (标签)
- id, name

### Comment (评论)
- id, postId, userId, content, createdAt

### 关联表
- PostCategory (文章-分类)
- PostTag (文章-标签)

## 开发命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint

# 数据库迁移
npm run db:init

# 填充数据
npm run db:seed
```

## 部署

### Vercel (推荐)

1. 将项目推送到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量 `DATABASE_URL` 和 `JWT_SECRET`
4. 部署

### 其他平台

确保设置以下环境变量：
- `DATABASE_URL` - Neon 数据库连接串
- `JWT_SECRET` - JWT 密钥

## 注意事项

1. **JWT_SECRET**: 生产环境务必使用强随机密钥
2. **数据库迁移**: 生产环境使用 `npx prisma migrate deploy`
3. **CORS**: 如需跨域访问，需配置 Next.js CORS 中间件
4. **文件上传**: 当前版本不支持图片上传，封面和头像使用 URL

## License

MIT
