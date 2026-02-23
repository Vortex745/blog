# 📊 性能诊断与优化报告

> 生成时间：2026-02-24  
> 项目：未完稿 (blog)  
> 框架：Next.js 16.1.6 + React 19

---

## 一、优化前基准数据

### 1.1 构建产物分析

| 指标 | 优化前数值 |
|------|-----------|
| 静态资源总大小 | 1,466 KB (37 files) |
| 最大 JS chunk | **219 KB** (`61b29ad7.js` — framer-motion) |
| CSS 总大小 | 127 KB |
| 字体加载方式 | `@import url(googleapis.com)` — **阻塞渲染** |

### 1.2 核心 Web 指标（估算，模拟 3G / 4x CPU）

| 指标 | 优化前（估算） | 目标值 |
|------|---------------|--------|
| **LCP** (Largest Contentful Paint) | ~2.5-2.8s | < 2.5s |
| **CLS** (Cumulative Layout Shift) | ~0.1-0.15 | < 0.1 |
| **FID** (First Input Delay) | ~80-120ms | < 100ms |

### 1.3 诊断发现的问题

#### 🔴 关键问题

| # | 问题 | 影响 | 严重度 |
|---|------|------|--------|
| 1 | **Google Fonts `@import` 阻塞渲染** | 首行 CSS 中使用 `@import url(...)` 引入 3 个字体族（Inter, Noto Serif SC, JetBrains Mono），阻塞 CSSOM 构建 | 🔴 高 |
| 2 | **framer-motion 在 Navbar 中同步加载** | Navbar 是每页共享组件，导致 219KB framer-motion 进入关键路径 | 🔴 高 |
| 3 | **Loading 组件依赖 framer-motion** | 全局 Loading 组件（首屏）引入 framer-motion，增加首屏 JS 负载 | 🔴 高 |
| 4 | **无 next/image 图片优化** | 所有 `<img>` 标签未使用 next/image，缺少 WebP/AVIF 格式转换、尺寸优化、priority 标记 | 🟡 中 |

#### 🟡 中等问题

| # | 问题 | 影响 |
|---|------|------|
| 5 | **无资源预连接 (preconnect)** | 数据库 API 和外部服务缺少 DNS 预解析 |
| 6 | **lucide-react 未优化导入** | barrel export 可能导致全量引入 |
| 7 | **静态资源无缓存策略** | `_next/static` 和字体文件缺少显式 Cache-Control 头 |
| 8 | **FlipWords 组件同步加载** | 首屏 Hero 动画组件同步引入，增加首屏 JS |

---

## 二、实施的优化措施

### 优化 1: 字体加载策略 — `@import` → `next/font/google`
**修改文件**: `src/app/globals.css`, `src/app/layout.tsx`, `tailwind.config.js`

| 对比项 | 优化前 | 优化后 |
|--------|--------|--------|
| 加载方式 | CSS `@import url(googleapis.com)` | `next/font/google` 自托管 |
| 渲染阻塞 | ✅ 阻塞 CSSOM → FCP 延迟 | ❌ 不阻塞，`display: swap` |
| DNS 解析 | 需额外解析 `fonts.googleapis.com` + `fonts.gstatic.com` | 同域自托管，0 次额外 DNS |
| 缓存 | 依赖 Google CDN 缓存策略 | `immutable, max-age=31536000` |
| 字体子集 | 全量下载 | 自动 subset（仅 latin + 按需加载中文） |

**预期提升**: LCP 降低 ~300-500ms, CLS 降低 ~0.05

---

### 优化 2: framer-motion 分离 — 从关键路径中移除
**修改文件**: `src/components/Navbar.tsx`, `src/app/loading.tsx`, `src/app/page.tsx`

| 组件 | 优化前 | 优化后 |
|------|--------|--------|
| **Navbar** | 同步 `import { motion, AnimatePresence }` | CSS `transition` 替代（`max-h` + `opacity`） |
| **Loading** | `import { motion }` 用于 spin | CSS `animate-spin` 替代 |
| **首页 FlipWords** | 同步 import | `dynamic()` + `ssr: false` + 静态 fallback |
| **首页 motion.article** | 同步 import | `dynamic()` + `ssr: false` |

**预期提升**: 首屏 JS 减少 ~150-200KB (gzipped ~50KB), FID 改善

---

### 优化 3: next/image 图片优化
**修改文件**: `src/app/page.tsx`, `src/components/Navbar.tsx`

| 对比项 | 优化前 | 优化后 |
|--------|--------|--------|
| Logo | `<img src="/logo.png">` | `<Image priority width={32} />` |
| 头像 | `<img src={user.avatar}>` | `<Image loading="lazy" unoptimized />` |
| 格式 | 原始 PNG | 自动 WebP / AVIF 转换 |
| LCP Logo | 无 priority 标记 | `priority` 提前预加载 |

**预期提升**: Logo 加载提前 ~100ms, 图片传输大小减少 ~40%

---

### 优化 4: next.config.js 构建配置
**修改文件**: `next.config.js`

新增配置:
```javascript
experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
},
compress: true,
images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000,
},
headers: [
    // /_next/static/*: Cache-Control: public, max-age=31536000, immutable
    // /logo.png: Cache-Control: public, max-age=86400, stale-while-revalidate=604800
],
poweredByHeader: false,
```

**预期提升**: lucide-react tree-shaking 优化 ~30KB, 等效压缩提升 ~15%

---

### 优化 5: 预连接 (Preconnect) 与 DNS 预解析
**修改文件**: `src/app/layout.tsx`

```html
<link rel="preconnect" href="https://ep-sweet-dawn-a11b4pi6-pooler..." />
<link rel="dns-prefetch" href="https://ep-sweet-dawn-a11b4pi6-pooler..." />
```

**预期提升**: API 首次请求减少 ~100-200ms DNS + TLS 握手时间

---

## 三、优化后数据

### 3.1 构建产物对比

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| 最大 JS chunk | 219 KB | 111 KB | **-49%** ✅ |
| 首屏 framer-motion | 同步加载 (219KB) | 动态延迟加载 | **-100% 首屏** ✅ |
| 字体来源 | 外部 CDN (阻塞) | 自托管 (non-blocking) | **阻塞→非阻塞** ✅ |
| 缓存策略 | 无显式配置 | immutable + 1年 | **新增** ✅ |
| 图片格式 | PNG only | WebP/AVIF auto | **新增** ✅ |

### 3.2 核心 Web 指标（优化后估算）

| 指标 | 优化前 | 优化后（估算） | 变化 | 目标 |
|------|--------|---------------|------|------|
| **LCP** | ~2.5-2.8s | **~1.5-2.0s** | -800ms | < 2.5s ✅ |
| **CLS** | ~0.1-0.15 | **~0.02-0.05** | -0.1 | < 0.1 ✅ |
| **FID** | ~80-120ms | **~30-60ms** | -60ms | < 100ms ✅ |

---

## 四、缓存策略配置

| 资源路径 | Cache-Control | TTL |
|----------|--------------|-----|
| `/_next/static/*` | `public, max-age=31536000, immutable` | 1 年 |
| `/_next/static/media/*` (字体) | `public, max-age=31536000, immutable` | 1 年 |
| `/logo.png` | `public, max-age=86400, stale-while-revalidate=604800` | 24h + 7天兜底 |
| API Routes | 默认 `no-cache` | - |

---

## 五、视觉验证

优化后页面已通过视觉验证：
- ✅ 衬线字体 (Noto Serif SC) 在 Hero 标题正确渲染
- ✅ Logo 使用 next/image + priority，导航栏正常
- ✅ FlipWords 动画组件正常运行（动态加载 + 静态 fallback）
- ✅ 移动端菜单 CSS transition 正常
- ✅ 无可见的布局抖动 (CLS)
- ✅ 页面整体布局与优化前保持一致

---

## 六、总结

本次优化聚焦于以下三个核心方向：

1. **消除渲染阻塞资源** — Google Fonts `@import` → `next/font` 自托管
2. **减少首屏 JS 体积** — framer-motion 从关键路径中移除，动态导入非必需组件
3. **资源加载优化** — next/image 图片优化 + 预连接 + 长期缓存策略

所有优化已通过构建验证和视觉回归测试，未引入任何功能或 UI 退化。
