# 子衿博客

> 基于 Astro + React + Tailwind CSS 的个人博客，内置完整后台管理系统

![Astro](https://img.shields.io/badge/Astro-6.x-FF5D01?logo=astro&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-3.x-88CE02?logo=greensock&logoColor=white)

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Astro 6 + React 19 |
| 样式 | Tailwind CSS 4 + shadcn/ui |
| 动画 | GSAP 3 |
| 图标 | Lucide React |
| 图床 | ImgBB |
| 部署 | Vercel Serverless + CDN |

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

开发服务器默认运行在 `http://localhost:4321`，后台地址 `http://localhost:4321/admin`。

## 功能特性

### 前台展示
- **首页** — Hero 区域 + 文章/项目/图库概览
- **文章** — Markdown 渲染、目录导航、代码高亮
- **项目** — 作品展示卡片
- **图库** — 瀑布流相册，按来源分类筛选
- **关于** — 个人信息展示
- 响应式设计 + 深色模式
- GSAP 页面过渡与微交互动画

### 后台管理
- **登录认证** — 基于 localStorage 的会话管理
- **首页管理** — Hero 文案与展示内容编辑
- **文章管理** — Markdown 编辑器 + LLM 润色功能
- **项目管理** — 封面图上传（ImgBB 图床）
- **图库管理** — 批量上传、URL 导入、拖拽排序
- **关于管理** — 头像与个人信息编辑

## 图床配置

图片上传使用 [ImgBB](https://imgbb.com/) 图床，API Key 通过环境变量配置：

```bash
IMGBB_API_KEY="your-api-key"
```

支持的格式：JPG、PNG、GIF、WebP、BMP、TIFF，单张最大 32MB。

## 后台登录

| 字段 | 值 |
|------|----|
| 用户名 | `admin` |
| 密码 | `1234` |

## 许可证

MIT
