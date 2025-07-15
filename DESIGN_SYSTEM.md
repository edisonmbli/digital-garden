“光影代码”数字花园 - 设计系统 v1.1
本文档定义了「光影代码」项目所有具体的设计令牌 (Design Tokens)，作为 UI 开发、组件构建和 AI 规则的权威技术参考。所有设计决策旨在实现**“极简美学”、“流体与趣味性交互”和“内容为王”**的核心原则。

1. 色彩 (Color Palette)
所有颜色都在 app/globals.css 中通过 HSL 格式的 CSS 变量定义，以便于维护和实现主题切换。

亮色模式 (Light Mode)
Background (背景色 - 微冷调的亚麻白)
  --background: 210 40% 98%

Foreground (前景色 - 炭黑色)
  --foreground: 224 71.4% 4.1%

Card (卡片背景与文本)
  --card: 210 40% 98%
  --card-foreground: 224 71.4% 4.1%

Popover (浮层背景与文本)
  --popover: 210 40% 98%
  --popover-foreground: 224 71.4% 4.1%

Primary (主色 - 天空蓝)
  --primary: 217.2 91.2% 59.8%
  --primary-foreground: 210 40% 98%

Secondary (辅色 - 云灰色)
  --secondary: 210 40% 96.1%
  --secondary-foreground: 222.2 47.4% 11.2%

Muted (静默色)
  --muted: 210 40% 96.1%
  --muted-foreground: 215.4 16.3% 46.9%

Accent (强调色)
  --accent: 210 40% 96.1%
  --accent-foreground: 222.2 47.4% 11.2%

Destructive (危险/删除色)
  --destructive: 0 84.2% 60.2%
  --destructive-foreground: 210 40% 98%

Border, Input & Ring (边框、输入框与焦点环)
  --border: 214.3 31.8% 91.4%
  --input: 214.3 31.8% 91.4%
  --ring: 222.2 47.4% 11.2%

暗黑模式 (Dark Mode)
Background (背景色 - 深邃蓝)
  --background: 222.2 84% 4.9%

Foreground (前景色 - 亮灰色)
  --foreground: 210 40% 98%

Card (卡片背景与文本)
  --card: 222.2 84% 4.9%
  --card-foreground: 210 40% 98%

Popover (浮层背景与文本)
  --popover: 222.2 84% 4.9%
  --popover-foreground: 210 40% 98%

Primary (主色 - 天空蓝)
  --primary: 217.2 91.2% 59.8%
  --primary-foreground: 222.2 47.4% 11.2%

Secondary (辅色 - 静默深蓝)
  --secondary: 217.2 32.6% 17.5%
  --secondary-foreground: 210 40% 98%

Muted (静默色)
  --muted: 217.2 32.6% 17.5%
  --muted-foreground: 215 20.2% 65.1%

Accent (强调色)
  --accent: 217.2 32.6% 17.5%
  --accent-foreground: 210 40% 98%

Destructive (危险/删除色)
  --destructive: 0 62.8% 30.6%
  --destructive-foreground: 210 40% 98%

Border, Input & Ring (边框、输入框与焦点环)
  --border: 217.2 32.6% 17.5%
  --input: 217.2 32.6% 17.5%
  --ring: 217.2 91.2% 59.8%

2. 排版 (Typography)
主字体 / UI 字体 (Sans-serif)
  --名称: Figtree (from Google Fonts)
  --CSS 变量: var(  --font-sans)
  --特点: 现代、友好、清晰易读。

正文字体 (Serif)
  --名称: Lora (from Google Fonts)
  --CSS 变量: var(  --font-serif)
  --特点: 优雅、可读性高，适用于长篇内容，营造沉静的阅读氛围。

3. 圆角 (Border Radius)
基础圆角: 0.75rem
  --CSS 变量:   --radius
  --Tailwind 对应: 这将映射到 rounded-lg，并以此为基准计算其他尺寸 (rounded-md, rounded-sm)。

4. 间距 (Spacing)
核心原则: 遵循 Tailwind CSS 默认的、基于 rem 的 4px 比例间距系统。
开发规范: 严禁在代码中使用任意像素值（如 mt-[13px]）。所有间距和尺寸，都应选择最接近的 Tailwind 预设单位（如 mt-3, p-4, w-64），以保证整个网站的视觉节奏和谐统一。