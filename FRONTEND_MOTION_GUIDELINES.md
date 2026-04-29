# 前台动效规范

本规范用于 `src/pages` 前台页面、`src/layouts/BaseLayout.astro` 和前台共享样式。目标是让交互响应更轻、更稳，不把动画做成视觉负担。

## 决策顺序

1. 高频操作不做位移动画。导航、筛选、搜索这类常用操作只保留颜色、透明度和轻微按压反馈。
2. 低频界面进入可以动。页面首屏、滚动出现、移动菜单展开可以使用短距离位移、透明度和轻微缩放。
3. 动画必须解释状态。移动菜单使用 `t-panel-slide` 表达面板出现，菜单图标使用 `t-icon-swap` 表达状态切换。
4. 没有明确原因就不加动画。装饰性动效只允许出现在首屏或低频展示区域。

## 时间和曲线

| 场景 | 时长 | 曲线 | 说明 |
| --- | --- | --- | --- |
| 按压反馈 | `140ms-160ms` | `var(--motion-ease-press)` | 只动 `transform` |
| Hover 状态 | `200ms` | `var(--motion-ease-out)` | 只动颜色、阴影、轻微 transform |
| 列表/卡片进入 | `280ms-420ms` | `power2.out` / `power3.out` | 由 `src/scripts/animations.ts` 统一控制 |
| 移动菜单展开 | `260ms` 打开，`180ms` 关闭 | `var(--panel-ease)` | 使用 transitions-dev 的 panel reveal |
| 数字计数 | `500ms` 左右 | ease-out | 只用于归档统计这类低频展示 |

## CSS 写法

| Before | After | Why |
| --- | --- | --- |
| `transition: all 0.15s ease` | 明确列出 `background-color, border-color, color, box-shadow, transform` | 避免宽泛属性把布局变化也带进动画 |
| `padding-left` 做列表 hover 位移 | `transform: translateX(4px)` | 不触发布局重排，列表扫描更稳 |
| hover 规则直接裸写 | 放进 `@media (hover: hover) and (pointer: fine)` | 避免触屏设备误触 hover 状态 |
| 点击只变颜色 | `:active { transform: scale(0.97) }` | 按钮要给即时按压反馈 |
| 面板自写 `max-height` 动画 | 优先用 `t-panel-slide` | 复用 transitions-dev 的可访问性和状态约定 |

## 实现约定

- 优先使用全局 token：`--motion-duration-fast`、`--motion-duration-standard`、`--motion-ease-out`、`--motion-ease-press`。
- 只动画 `transform`、`opacity`、`filter`、颜色、边框色、阴影；不要动画 `width`、`height`、`padding`、`margin`、`gap`。
- 卡片 hover 可以 `translateY(-1px)`，active 回到 `scale(0.99)`；按钮 active 使用 `scale(0.97)`。
- 所有 hover 动效必须加 pointer/hover 媒体门控。
- 不新增页面级动画库；现有前台进入动画继续由 `src/scripts/animations.ts` 统一调度。
- transitions-dev 的 `:root` 和 snippet 只放一次，不重复复制。当前已使用 `t-panel-slide` 和 `t-icon-swap`。
- 必须保留 `prefers-reduced-motion` 处理。新增 transitions-dev snippet 时也要保留它自带的 reduce motion 块。

## 选择 transitions-dev 片段

| UI 元素 | 片段 | 当前项目用法 |
| --- | --- | --- |
| 移动端菜单面板 | `t-panel-slide` | `BaseLayout.astro` 的 `.mobile-menu__content` |
| 菜单/关闭图标切换 | `t-icon-swap` | `BaseLayout.astro` 的移动端菜单按钮 |
| 搜索筛选面板 | `t-panel-slide` 候选 | 如果后续重构筛选折叠，优先替换 max-height 动画 |
| 数字统计 | `number pop-in` 候选 | 如果统计数字变成动态刷新，再考虑按位弹入 |

## 验收清单

- 前台公开页面没有 `transition: all`。
- Hover 动效在触屏设备不会触发。
- 按钮和卡片有轻微但不夸张的按压反馈。
- 首屏和滚动进入动画总时长不拖慢阅读。
- `npm run build` 通过。
