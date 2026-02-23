# 📝 未完稿 (Draft) - UI/UX 优化视觉与样式指南 (Design System)

基于 `@ui-ux-pro-max` 技能标准与响应式栅格、WCAG 2.1 AA 规范，已为当前博客系统完成界面高保真重构与设计体系沉淀。

---

## 🎨 1. 颜色体系 (Color System)
系统采用高级的**【蓝紫粉白 (ID-0076)】**渐变风格，平衡了科技博客的理性和个人博客的温度感。所有颜色的选用均已通过背景色（#FAFAFC / #FFFFFF）的对比度测试，满足无障碍阅读要求条件 (≥ 4.5:1)。

| 色彩类型 | 变量名 / 对应颜色 | 用途与层级说明 |
| :--- | :--- | :--- |
| **主色 (Primary)** | `--primary`: `#6873E0` (蓝紫)<br/>`--primary-dark`: `#525CB3` | 用于第一层级的行为召唤 (CTA)、核心按钮、重要图标与重点内容强调。 |
| **辅助色 (Accent)** | `--accent`: `#FCE3FA` (粉白点缀)<br/>`--accent-alt`: `#D9D6F2` (紫白) | 用于渐变过渡层、辅助性区域的高亮（如光斑背景、标签底色），不喧宾夺主。 |
| **中性文字 (Neutral)** | `--foreground`: `#09090B` (极灰黑)<br/>`--muted`: `#71717A` (中性灰) | **一级信息** (如大标题/正文) 统一使用极灰黑，**二级信息** (注释/摘要) 使用中性灰，保证至少 4.5:1 视距对比度。 |
| **背景层 (Surface)** | `--background`: `#FAFAFC` (全局极冷)<br/>`--surface`: `#FFFFFF` (纯白卡片) | 通过非常微妙的色阶差（FAFAFC 与 FFFFFF）自然划分全局层和内容层（微几何卡片概念）。 |

---

## 📐 2. 响应式布局与栅格 (Layout & Grid)
全面适配多端阅读的高级网格展示（采用 TailwindCSS 断点规则）：

- 💻 **桌面端 (≥1200px / `lg`)**：内容最大受限宽度 `max-w-6xl`。采用经典的不对称三栏/两栏划分：左侧主功能区 `col-span-2`（视觉占比约 66%），右侧组件附属区 `col-span-1`。
- 📱 **平板端 (768px-1199px / `md`)**：部分横向排布并为垂直流动。内容最大容器开始使用横向相对 `px-6` 边距缓冲。如 BentoGrid 将自适应调整卡片的宽距，保证交互面积。
- 🤏 **移动端 (<768px)**：所有层级收束为单列 `grid-cols-1`。导航栏缩减为汉堡菜单 (Hamburger Menu)，大字号层级按比例压缩，确保无水平滚动条。

---

## 🔠 3. 信息层级与排版 (Typography)
字重、间距分组大于内部间距，遵循格式塔闭合原则。

1. **一级信息 (H1 & Hero Title)**：
   - 配置：`text-4xl` 到 `lg:text-6xl`, `font-serif`, `font-extrabold`, `tracking-tight` (极紧凑字间距)。
   - 案例：首页“有些梦并不遥远，用代码…”
2. **二级信息 (Module Title / H2 / H3)**：
   - 配置：`text-lg` 或 `text-xl`, `font-bold`，辅以深色 `--foreground`。
   - 案例：“最新文章”、“浏览分类”。
3. **三级信息 (Body Text & Description)**：
   - 配置：`text-sm` 或 `text-base`（具体由模块空间决定），必须使用 `leading-relaxed` (行高 1.625) 或 `line-height: 1.7` 进行支撑。
   - 案例：各类笔记摘要、侧边栏博主签名档。

---

## 🖱️ 4. 交互元素与组件状态 (Interaction States)
摒弃了任何会导致坐标偏移的突兀 Hover（防止布局抖动），全部使用复合光影过渡。

- **按钮 (.btn-primary 等)**：
  - **默认 / Normal**：渐变背景 (`#6873E0` 到 `#D9D6F2`)，带有一个内聚性阴影。
  - **悬停 / Hover**：`translateY(-1px)` 的微小漂浮感，阴影扩散变为 `box-shadow: 0 4px 14px -3px rgba(104, 115, 224, 0.5)`，提供强烈的“可点击感”。
  - **禁用 / Disabled**：透明状态减小至 `opacity-50` 并移除 `cursor-pointer`。
- **Bento 卡片 (.card-paper) / (BentoGridItem)**：
  - **默认 / Normal**：极简的微边框。
  - **悬停 / Hover**：边框高亮染色为主题色，内部触发 `group-hover/bento:translate-x-2` 的微动效引导用户的视线，强化浏览连贯性。
- **链接与图标**：
  - 由 `--muted` 中性灰过渡到 `--primary` 主色，持续时长 `duration-200` 平滑。

这份设计指南与最新应用到您项目全局的 `.css`、首页和卡片级组件相互结合，已经为您构建好了完整的高保真界面体系！
