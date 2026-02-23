# 性能诊断与优化 TODO

## Phase 1: 诊断
- [ ] 分析当前构建配置（next.config.js）
- [ ] 分析首页加载的组件依赖
- [ ] 审计第三方依赖大小（package.json）
- [ ] 检查图片/资源加载策略
- [ ] 使用 @next/bundle-analyzer 生成依赖分析
- [ ] Lighthouse 基准测试（优化前）

## Phase 2: 优化实施
- [ ] next.config.js 构建配置优化
- [ ] layout.tsx 资源预连接/预加载
- [ ] 首页组件动态导入（code splitting）
- [ ] 图片优化（lazy load、WebP、placeholder）
- [ ] 第三方库优化（framer-motion tree-shaking）
- [ ] CSS 优化（关键CSS内联）
- [ ] 缓存策略配置

## Phase 3: 验证
- [ ] Lighthouse 优化后测试
- [ ] 前后对比报告
