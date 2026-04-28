# Admin Sync Animation Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 后台成功添加文章、项目、图库后，前台同名模块立即读取并展示这些本地管理数据，同时让后台导航与模块切换更轻、更快。

**Architecture:** 保留现有 Astro content collection 作为构建时内容来源，新增一个轻量客户端同步脚本读取后台 localStorage 数据并补齐前台列表与首页概览。后台动效只保留有明确反馈和空间连续性的动画，导航 pill 使用已缓存布局数据和更短 duration，页面切换避免重复入场和低价值 reflow。

**Tech Stack:** Astro 6, TypeScript, GSAP 3, localStorage, CSS motion tokens.

---

## File Structure

- Modify: `src/layouts/BaseLayout.astro` - 引入前台同步初始化。
- Create: `src/scripts/admin-content-sync.ts` - 读取并规范化后台文章/项目/图库数据，渲染到前台首页、文章列表、项目列表和图库。
- Modify: `src/pages/admin/projects.astro` - 为项目持久化稳定 `id`、`date`、`updatedAt`，并保持已有编辑兼容。
- Modify: `src/pages/admin/articles.astro` - 保存文章摘要字段，删除/保存后触发同源 storage 通知。
- Modify: `src/pages/admin/gallery.astro` - 保存/删除后触发同源 storage 通知，并让前台图库可监听更新。
- Modify: `src/scripts/admin-animations.ts` - 精简导航 pill 动画、减少交换后的重复动画和布局读写。
- Modify: `src/layouts/AdminLayout.astro` - 调整后台 CSS 动效 token、view-transition keyframes 和高频导航反馈。

## Task 1: Shared Frontend Content Sync

- [ ] Create `src/scripts/admin-content-sync.ts` with safe JSON parsing helpers.
- [ ] Normalize `admin-articles-data` into display rows with title, tags, date, summary, and no broken detail route.
- [ ] Normalize `admin-projects-data` into display cards with title, category/tech tags, date, description, cover/url where available.
- [ ] Render local admin articles into `/articles` and homepage latest articles.
- [ ] Render local admin projects into `/projects` and homepage selected projects.
- [ ] Rebuild filters and counts after injecting client-managed items.
- [ ] Listen for `storage` and a local `admin-content:changed` event so open front pages refresh after admin saves in another tab or same document context.

## Task 2: Admin Save Metadata

- [ ] Update project save logic to preserve existing IDs and dates on edit.
- [ ] Add project `updatedAt` on edit and `date` on create.
- [ ] Add article `description` derived from content when saving.
- [ ] Dispatch `admin-content:changed` after article/project/gallery save and delete.

## Task 3: Motion And Switching Performance

- [ ] Shorten admin page transition keyframes to subtle opacity/translate only.
- [ ] Keep nav pill animation compositor-only and reduce stretch/bounce for high-frequency admin navigation.
- [ ] Ensure first-load page entrance stays subtle and swaps do not replay heavy card staggers.
- [ ] Add CSS `contain`/`content-visibility` where safe for admin main content modules.
- [ ] Avoid `transition: all` in touched admin navigation/module surfaces.

## Task 4: Verification

- [ ] Run `npm run build`.
- [ ] Run TypeScript diagnostics if build exposes issues.
- [ ] Inspect `git diff --stat` and changed files.
- [ ] Report changed files, simplifications, verification, and remaining risks.
