# 性能诊断与优化 TODO

## Phase 1: 诊断
- [x] 分析当前构建配置（next.config.js）
- [x] 分析首页加载的组件依赖
- [x] 审计第三方依赖大小（package.json）
- [x] 检查图片/资源加载策略
- [x] 构建对比（优化前 vs 优化后）
- [x] 视觉回归验证

## Phase 2: 优化实施
- [x] next.config.js 构建配置优化 (optimizePackageImports, compress, images, headers)
- [x] layout.tsx: next/font 自托管字体 + 预连接
- [x] globals.css: 移除阻塞渲染的 @import
- [x] tailwind.config.js: CSS 变量字体对接
- [x] page.tsx: 动态导入 FlipWords + framer-motion
- [x] page.tsx: next/image 图片优化 (Logo priority)
- [x] Navbar.tsx: 移除 framer-motion，CSS transition 替代
- [x] loading.tsx: 移除 framer-motion，CSS animate-spin 替代
- [x] PERFORMANCE_REPORT.md 完整诊断报告

## Phase 3: 部署
- [x] Git commit: 734004a
- [ ] Git push to GitHub (⚠️ 网络连接失败 — TLS error，需用户手动重试)
- [ ] Vercel 自动部署 (依赖 push 成功)

## 备注
- GitHub push 失败原因: TLS connect error — 本地网络/代理问题
- 用户需要手动执行: `git push origin main --force` (网络恢复后)
- Vercel 已配置 GitHub 集成，push 成功后将自动触发部署
