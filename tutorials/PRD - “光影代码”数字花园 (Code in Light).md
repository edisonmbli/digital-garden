PRD - “光影代码”数字花园 (Code in Light)
version：2.1

1. 核心原则与技术理念 (Guiding Principles)
- 为我所用，利于他人(Built for Self, Shared for Others): 项目必须首先解决我自己的展示与记录需求，同时其构建过程和最终产出，要能形成一套清晰、可复现、对其他独立开发者有价值的最佳实践教程。
- 现代化的最佳实践 (Modern Best Practices): 严格遵循我们共同制定的 project.rules，采用基于 Next.js App Router 的集成平台架构，整合 Clerk, Sanity, Neon (Vercel Postgres), Prisma, Vercel 等领域最佳工具。
- 设计驱动开发 (Design-Driven Development): 遵循 Refactoring UI 的核心原则，将“设计基因”（字体、颜色、间距）前置，确保产品的视觉一致性与独特性。
- AI 辅助，人机协同 (AI-Assisted Collaboration): 将 AI 视为“结对伙伴”和“专家顾问”，在整个开发生命周期中，利用 AI 提升效率，但最终的架构决策和代码质量由人类开发者负责。

2. 功能需求 (Functional Requirements) - v1.0 上线目标
2.1 用户认证 (Authentication - powered by Clerk)
- FR-1.1 (公开访问): 所有访客默认可以浏览网站的绝大部分内容。
- FR-1.2 (登录/注册入口): 在网站导航栏为未登录用户提供清晰的登录/注册入口。
- FR-1.3 (用户状态显示): 对于已登录用户，在同一位置应显示 <UserButton>。
- FR-1.4 (认证方式):
  - 主要方式: 邮箱/密码登录。
  - 社交登录支持: (教程扩展点) 为了覆盖不同地区的用户习惯，必须集成 Google、GitHub 和 微信 (WeChat) 三种社交登录方式。

2.2 内容呈现 (Content Presentation - powered by Sanity & Next.js)
- FR-2.1 (首页):
  - Hero 区: 全宽、自动轮播的 Slider。
  - 影像馆精选: 卡片网格形式。
  - 开发者日志精选: 卡片列表形式。
- FR-2.2 (影像馆 - Gallery):
  - /gallery: “影像组”列表页，采用砌体式网格 (Masonry Grid) 布局。
  - /gallery/[group-slug]: “影像组”详情页，采用瀑布流布局，混合展示图片和嵌入的 YouTube 视频。
  - 图片交互: 点击后，在模态框 (Dialog) 中进行大图展示。
- FR-2.3 (开发者日志 - Log):
  - /log: 标准的文章列表页。
  - /log/[post-slug]: 文章详情页，必须完美支持 Sanity Portable Text 渲染出的富文本内容，特别是代码块（带语法高亮）。

2.3 用户交互 (User Interaction - powered by Server Actions & Prisma)
- FR-3.1 (权限控制):
  - 点赞与评论: 任何登录用户，都可以对单张照片或单篇文章进行点赞和评论。
- FR-3.2 (数据变更):
  - 所有交互操作必须通过 Server Actions 实现，并提供乐观更新 (Optimistic UI) 和 pending 状态。
  - 操作成功后，必须通过 revalidateTag 机制，让相关页面的数据显示为最新状态。

2.4 内容与站点管理 (Content & Site Management)
- FR-4.1 (内容管理): 所有“内容密集型”的数据（摄影作品、日志文章、关于我页面等），必须通过 Sanity Studio 进行管理。
- FR-4.2 (站内简易后台 - 作者专属):
  - 在主站内，提供一个受角色权限 (role: "admin") 保护的 /admin 页面。
  - 该页面允许网站所有者查看和管理（如删除）所有用户评论。

3. 非功能性需求 (Non-Functional Requirements)
- NFR-1 (性能):
  - 静态优先: 所有内容页面必须默认被静态生成 (SSG) 并可通过 On-Demand ISR 进行更新。
  - 核心 Web 指标: 线上环境的所有页面的 LCP, FID, CLS 指标必须达到“良好”标准。
- NFR-2 (开发与部署):
  - 环境隔离: 严格分离本地（Docker Postgres）与生产（Neon/Vercel Postgres）的数据库环境。
  - CI/CD: 所有代码变更必须通过 GitHub PR -> Vercel 预览部署 -> 合并到 main -> 自动生产部署的流程进行。
- NFR-3 (安全):
  - 数据边界: 严格遵循 DAL + DTO 模式。
  - 授权: 所有需要权限的操作，必须在 Server Action 或 DAL 中进行严格的后端校验。
- NFR-4 (可访问性 & SEO):
  - SEO: 所有页面必须通过 generateMetadata 动态生成精准的元数据。
  - A11y: 所有可交互元素必须符合基本的无障碍标准。
- NFR-5 (国际化 - Internationalization, i18n):
  - 支持语言: 网站 UI 和内容（通过 Sanity）必须至少支持中文 (zh) 和英文 (en) 两种语言。
  - 路由策略: 必须采用基于路径的国际化策略 (e.g., /en/log, /zh/log)。
  - 语言检测: 必须通过 Middleware 自动检测用户浏览器偏好，并重定向到相应的语言路径。
  - 语言切换器: 网站必须在页面的一个固定位置（如页脚），提供一个清晰的、允许用户手动切换语言（中/英）的UI组件。
- NFR-6 (视觉模式 - Visual Mode):
  - 网站必须支持亮色 (Light) 和暗黑 (Dark) 两种视觉主题。
  - 应提供一个清晰、易于访问的切换按钮，让用户可以手动切换主题。
  - （可选，v2考虑）应用应能自动检测并匹配用户操作系统的颜色偏好设置