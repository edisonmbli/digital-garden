# 第九章：构建一个现代化的教程系统——从需求到上线的全过程复盘

## 1. 章节目标

本章旨在完整复盘一个功能相对完备的“教程系统”（或称 Blog 系统）的建设历程。我们将从最初的需求构思出发，深入探讨技术选型、数据架构设计、核心功能实现、交互优化，最终沉淀出一套可复用的实践经验。

这不仅仅是一份技术实现指南，更是一次关于如何将模糊的产品想法，通过系统性的工程方法，逐步落地为高质量、可维护的线上功能的真实记录。

**读者将学到：**

- **需求分析与拆解**：如何将一个宏大的目标（如“做一个 Blog 系统”）拆解为可执行的、分阶段的任务。
- **混合数据架构设计**：如何巧妙地结合 Headless CMS (Sanity) 与关系型数据库 (PostgreSQL)，实现内容与交互数据的分离与融合。
- **现代 Web 架构实践**：在 Next.js App Router 体系下，如何组织数据访问层 (DAL)、页面路由和服务端组件。
- **复杂页面布局实现**：如何实现一个功能完善、体验良好的三栏式桌面布局，并优雅地适配移动端。
- **性能与体验优化**：从数据缓存、组件设计到交互细节，全方位提升用户体验。

---

## 2. 缘起：我们为什么需要一个新的教程系统？

随着 Digital Garden 内容的不断丰富，原有的项目展示形式已不足以承载系统性的知识分享。我们需要一个更强大、更结构化的平台来发布系列教程，记录项目的演进和技术思考。这就是“教程系统”的由来。

**核心需求对齐：**

1.  **结构化内容管理**：需要将单篇教程（Log）组织成有序的合集（Collection），方便用户体系化学习。
2.  **沉浸式阅读体验**：为桌面端用户提供信息密度高、导航便捷的三栏式布局；为移动端用户提供简洁、无干扰的阅读界面和快捷操作。
3.  **增强用户连接**：在教程页面引入点赞、评论等社交功能，建立作者与读者之间的互动桥梁。
4.  **技术栈统一与重构**：将新系统无缝融入项目现有的 Next.js + Sanity + Prisma 技术栈，并借此机会对旧有数据获取方式进行优化，建立统一的 DAL (Data Access Layer)。

---

## 3. 顶层设计：架构与数据模型

一个好的系统始于清晰的架构。我们采用了“内容与交互分离”的核心思想，为系统的可扩展性和可维护性奠定了坚实的基础。

### 3.1. 技术架构概览

- **前端/全栈框架**: Next.js (App Router)
- **内容管理 (CMS)**: Sanity.io
- **用户交互数据库**: PostgreSQL
- **ORM**: Prisma
- **UI**: Tailwind CSS + shadcn/ui
- **认证**: Clerk

### 3.2. 数据架构：Sanity + PostgreSQL 的双剑合璧

这是本次设计的精髓所在。我们没有将所有数据都塞进一个地方，而是做了明确的职责划分：

- **Sanity (内容层)**：负责所有“静态”的、由创作者管理的内容。
  - `devCollection`：定义“教程合集”，包含标题、描述、封面图、排序字段以及一个对 `log` 文档的引用数组。
  - `log`：定义“单篇教程”，包含标题、slug、正文 (Portable Text)、摘要、发布日期、作者等。

- **PostgreSQL (交互层)**：负责所有由用户行为产生的“动态”数据。
  - `Post`：一个核心的抽象模型，用于连接 Sanity 中的内容和我们自己的交互数据。它通过 `sanityDocumentId` 与 Sanity 的文档 `_id` 关联，并用 `contentType` 字段区分内容类型（如 'log', 'photo'）。
  - `Like`, `Comment`：记录用户的点赞和评论，通过 `postId` 与 `Post` 模型关联。

![Data Schema Diagram](https://.../schema.png) _（示意图：展示 Sanity 的 devCollection/log 与 PostgreSQL 的 Post/Like/Comment 之间的关系）_

这种模式的**巨大优势**在于：

- **关注点分离**：内容创作和用户交互是两个独立的业务领域，其数据模型的演进速度和方向也不同。分开存储使得各自的迭代更加灵活。
- **性能优化**：Sanity 擅长处理富文本和复杂内容关系，而 PostgreSQL 则能高效地处理高频次的事务性读写（如点赞、评论）。
- **可扩展性**：未来如果想为其他类型的内容（如 Gallery 的照片）也加上评论功能，只需在创建该内容时，在 `Post` 表中插入一条对应记录即可，无需改动 `Comment` 模型。

### 3.3. 数据访问层 (DAL) 的统一

为了避免在各个页面组件中散落着数据查询逻辑，我们建立了一个统一的 `lib/dal.ts` 文件。它是整个应用获取数据的唯一入口。

**核心职责：**

1.  **封装查询逻辑**：无论是从 Sanity (GROQ) 还是从 Prisma 获取数据，所有查询细节都被封装在 DAL 的函数中。
2.  **数据扩充 (Enrichment)**：这是 DAL 最关键的模式。例如，`getLogPostWithInteractions` 函数会：
    a. 先从 Sanity 获取一篇 `log` 的基础内容。
    b. 然后用这篇 `log` 的 `_id` 作为 `sanityDocumentId`，去 Prisma 的 `Post` 表中查询对应的点赞数、评论列表和当前用户是否点赞。
    c. 最后，将两部分数据合并成一个 `EnrichedLogPost` 对象返回给调用方。
3.  **缓存**：所有导出的数据获取函数都用 `React.cache` 包装，自动实现请求去重，提升服务端渲染性能。

```typescript:lib/dal.ts
// 伪代码示例：展示数据扩充模式
export const getLogPostWithInteractions = cache(
  async (slug: string, lang: Locale): Promise<EnrichedLogPost | null> => {
    // 1. 从 Sanity 获取基础内容
    const logPostFromSanity = await sanityClient.fetch(..., { slug, lang });
    if (!logPostFromSanity) return null;

    // 2. 从 Prisma 获取交互数据
    const postInteractions = await prisma.post.findUnique({
      where: { sanityDocumentId: logPostFromSanity._id },
      include: { _count: { select: { likes: true, comments: true } } }
    });

    // 3. 合并数据
    return {
      ...logPostFromSanity,
      likesCount: postInteractions?._count.likes ?? 0,
      commentsCount: postInteractions?._count.comments ?? 0,
    };
  }
);
```

---

## 4. 落地实战：从列表页到详情页

有了坚实的架构基础，我们开始分阶段实现核心页面。

### 4.1. 教程列表页 (`/log`)

**目标**：以卡片形式展示所有“教程合集”，卡片可展开，显示该合集下的所有教程文章链接。

**实现路径**：

1.  **路由 (`app/[lang]/log/page.tsx`)**: 作为服务端组件，它调用 `getAllDevCollectionsAndLogs(lang)` 从 DAL 获取所有需要的数据。
2.  **UI Shell (`LogPageShell`)**: 接收数据并负责整体页面布局。
3.  **核心组件 (`DevCollectionListCard`)**: 这是列表页最具交互性的部分。
    - 它接收一个 `collection` 对象作为 prop。
    - 使用 `useState` 管理自身的展开/折叠状态 (`isExpanded`)。
    - 整个卡片头部区域都可点击，触发 `onToggleExpand` 回调函数，该函数由父组件传入，用于更新状态。
    - 当 `isExpanded` 为 `true` 时，渲染合集内的教程列表。

### 4.2. 教程详情页 (`/log/[log-slug]`)

这是整个系统的核心，也是实现最复杂的部分。

**目标**：实现一个信息丰富、导航清晰、交互流畅的三栏式布局。

**实现路径**：

1.  **路由 (`app/[lang]/log/[log-slug]/page.tsx`)**: 调用 `getLogPostWithInteractions(logSlug, lang)` 获取当前文章的所有数据，包括其所属合集的信息和合集内的所有文章列表。

2.  **UI 核心 (`LogDetailPage`)**: 负责三栏布局的实现。
    - **整体布局**：使用 Flexbox (`<div class="flex">...</div>`) 构建三栏结构。
    - **左侧边栏 (合集内导航)**：
      - 接收 `allLogsInCollection` 数组作为 prop。
      - 遍历数组，渲染出合集内所有文章的 `Link` 列表。
      - 通过比较当前 `logSlug` 和列表项的 `slug`，高亮显示当前文章。
      - 使用 `position: sticky` 和 `top-8` 样式，使其在页面滚动时固定在视口中。
    - **中间主内容区 (文章正文)**：
      - 使用我们定制的 `PortableTextRenderer` 组件来渲染从 Sanity 获取的 `content` (Portable Text 格式)。
      - **关键交互**：`PortableTextRenderer` 在渲染标题（h1, h2, h3...）时，会调用一个 `onHeadingsExtracted` 回调，将提取出的标题文本、级别和 ID 传回给 `LogDetailPage`。
    - **右侧边栏 (文章目录)**：
      - `LogDetailPage` 将从中间区域获取到的 `headings` 状态，传递给 `TableOfContents` 组件。
      - `TableOfContents` 负责将这些标题数据渲染成一个可点击的目录，点击后平滑滚动到对应位置。
      - 同样使用 `position: sticky` 实现滚动吸附效果。

3.  **移动端适配 (`FloatingActionMenu`)**：
    - 在桌面端，点赞、评论按钮位于文章标题下方，清晰可见。
    - 在移动端，屏幕空间有限，我们将这些高频操作收纳进一个悬浮操作菜单 (`FloatingActionMenu`) 中。
    - 通过 CSS 媒体查询 (`hidden lg:block` 和 `lg:hidden`) 控制不同设备上元素的显隐。
    - 该悬浮菜单提供了返回顶部、点赞、评论、切换目录等快捷操作，极大地优化了移动端体验。

---

## 5. 重要知识与经验总结

1.  **Server Component 是数据获取的起点**：始终在服务端的 Page Component (`page.tsx`) 中发起初始的数据请求。这能充分利用服务端的计算能力和数据缓存，并将一个干净、完整的数据对象传递给子组件。

2.  **组件通信：Props 向下，回调向上**：`LogDetailPage` 是一个很好的例子。它通过 Props (`headings`) 将数据传递给子组件 (`TableOfContents`)，并通过回调函数 (`onHeadingsExtracted`) 从子组件 (`PortableTextRenderer`) 接收数据。这是 React 中最经典和稳健的通信模式。

3.  **“扩充”模式是处理关联数据的利器**：DAL 中的数据扩充模式，优雅地解决了跨数据源关联的问题。它让 Sanity 和 Prisma 各司其职，同时又能在需要时无缝结合。

4.  **布局粘性定位 (`position: sticky`)**：这是实现现代文档网站侧边栏效果的关键。它比 `fixed` 更灵活，因为元素只在其父容器内“粘性”，不会脱离文档流，避免了复杂的占位计算。

5.  **国际化 (i18n) 的全局考量**：本次重构也对国际化实践进行了优化。通过 `useI18n` hook，子组件可以独立地从全局 Provider 获取翻译字典 (`dictionary`)，而无需层层传递 `lang` 和 `dictionary` props，大大简化了组件的接口，提升了代码的整洁度和可维护性。

## 6. 结语与未来展望

通过本次系统性的建设，我们不仅为 Digital Garden 增加了一个强大的功能模块，更重要的是，我们探索并验证了一套行之有效的全栈应用开发模式。从清晰的架构设计，到统一的数据访问层，再到组件化的 UI 实现，每一步都为项目未来的健康发展打下了坚实的基础。

未来的优化方向可能包括：

- **全文搜索**：集成 Algolia 或类似服务，提供跨教程的快速搜索功能。
- **相关文章推荐**：基于标签或内容相似度，为用户推荐可能感兴趣的其他教程。
- **更精细的后台管理**：在 Sanity Studio 中构建更强大的管理界面，方便地对教程和合集进行排序、筛选和数据分析。

---

## 原始需求描述

### 1. Schema 重构

- devCollection : 开发教程合集，包含多语言名称、描述、封面图和关联的 log 文章
- log : 单篇开发日志，支持富文本内容（Portable Text）、标签、发布时间等

### 2. DAL 数据获取层扩展

基于现有的 DAL 模式，新增以下函数：

- getDevCollections(lang: Locale) : 获取所有开发教程合集
- getDevCollectionBySlug(slug: string, lang: Locale) : 获取特定合集及其关联的 log 文章
- getLogsByCollection(collectionSlug: string, lang: Locale) : 获取合集下的所有 log 文章

### 3. Develop Collection Listing Page 重构

将 `page.tsx` 重构为：

- 展示开发教程合集列表
- 每个合集显示封面图、标题、描述和包含的文章数量
- 支持多语言显示
- 保持现有的 SSG 生成模式

### 4. Develop Log Detail Page 重构

将 `page.tsx` 重构为：

- 支持两种路由模式：
  - /log/[collection-slug] : 显示合集详情页，列出该合集下的所有文章
  - /log/[collection-slug]/[log-slug] : 显示具体的 log 文章内容
- 集成 Portable Text 渲染器显示富文本内容
- 保持现有的互动功能（点赞、评论）

## 🎯 核心目标对齐

### 1. 桌面端三栏布局\*\*

- **左栏**：本合集的其他文章大纲（类似目录导航）
- **中栏**：文章内容 + 评论form + 评论列表（支持滚动加载）
- **右栏**：章节大纲 + 社交按钮 + 回到顶部按钮

### 2. 桌面端交互优化\*\*

- 点击comment按钮 → 中栏向上滚动，评论form进入可视区域
- 右栏底部固定"回到顶部"按钮 → 中栏快速滚动回文章顶部

### 3. 移动端悬浮操作菜单\*\*

- 底部固定悬浮按钮
- 点击后横向拉出半透明菜单：章节大纲、点赞、评论、关闭
- comment按钮点击后拉起评论form至可视区域

### 4. DAL函数重构\*\*

- 参考 <mcfile name="dal.ts" path="/Users/edisonmbli/Projects/digital-garden-ai/lib/dal.ts"></mcfile> 中 <mcsymbol name="getCollectionAndPhotosBySlug" filename="dal.ts" path="/Users/edisonmbli/Projects/digital-garden-ai/lib/dal.ts" startline="333" type="function"></mcsymbol> 的模式
- 创建 `getLogPostWithInteractions` 函数，同时获取并合并 Sanity 和 Postgres 数据

## 📋 分阶段实施计划

### **阶段一：DAL函数重构（核心数据层）**

1.  **新增 `getLogPostWithInteractions` 函数**

    ```typescript
    // 参考 getCollectionAndPhotosBySlug 的模式
    export const getLogPostWithInteractions = cache(
      async (slug: string, lang: Locale) => {
        // 1. 从 Sanity 获取 log 内容数据
        // 2. 从 Postgres 获取交互数据（点赞、评论统计）
        // 3. 合并数据并返回 EnrichedLogPost
      }
    )
    ```

2.  **新增 `getCollectionLogsBySlug` 函数**

    ```typescript
    // 获取当前log所属合集的其他文章列表
    export const getCollectionLogsBySlug = cache(
      async (logSlug: string, lang: Locale) => {
        // 通过log找到所属的devCollection
        // 返回该合集下的所有logs用于左侧导航
      }
    )
    ```

3.  **新增 `ensureLogPostExists` 函数**
    ```typescript
    // 确保 Postgres 中存在对应的 Post 记录
    export async function ensureLogPostExists(
      sanityDocumentId: string,
      contentType: 'log'
    )
    ```

### **阶段二：内容渲染优化**

1.  **优化 Portable Text 渲染**
    - 继续使用 `@portabletext/react`
    - 增强 <mcfile name="portable-text-renderer.tsx" path="/Users/edisonmbli/Projects/digital-garden-ai/app/ui/portable-text-renderer.tsx"></mcfile>
    - 支持章节大纲自动提取

2.  **新增 `TableOfContents` 组件**
    ```typescript
    // 从 Portable Text 中提取标题生成大纲
    // 支持点击跳转和当前阅读位置高亮
    ```

### **阶段三：布局重构**

1.  **新增 `LogDetailLayout` 组件**

    ```typescript
    // 桌面端：三栏布局
    // 移动端：单栏 + 悬浮操作菜单
    ```

2.  **新增 `CollectionNavigation` 组件**

    ```typescript
    // 左栏：显示当前合集的所有文章
    // 高亮当前文章，支持快速跳转
    ```

3.  **新增 `FloatingActionMenu` 组件**
    ```typescript
    // 移动端底部悬浮菜单
    // 包含：章节大纲、点赞、评论、关闭
    ```

### **阶段四：交互优化**

1.  **滚动交互**
    - Comment按钮点击 → 滚动到评论区域
    - 回到顶部按钮 → 滚动到文章顶部
    - 章节大纲点击 → 滚动到对应章节

2.  **评论系统集成**
    - 复用现有的 <mcfile name="comment-form.tsx" path="/Users/edisonmbli/Projects/digital-garden-ai/app/ui/comment-form.tsx"></mcfile> 和 <mcfile name="comment-list.tsx" path="/Users/edisonmbli/Projects/digital-garden-ai/app/ui/comment-list.tsx"></mcfile>
    - 支持滚动加载更多评论
    - 移动端评论form拉起交互

3.  **社交互动**
    - 复用现有的 <mcfile name="enhanced-like-button.tsx" path="/Users/edisonmbli/Projects/digital-garden-ai/app/ui/enhanced-like-button.tsx"></mcfile> 和 <mcfile name="enhanced-comment-button.tsx" path="/Users/edisonmbli/Projects/digital-garden-ai/app/ui/enhanced-comment-button.tsx"></mcfile>

### **阶段五：细节优化**

1.  **响应式适配**
    - 桌面端三栏布局优化
    - 移动端单栏 + 悬浮菜单
    - 平板端适配

2.  **性能优化**
    - 评论分页加载
    - 图片懒加载
    - 代码高亮优化

3.  **用户体验**
    - 阅读进度指示
    - 平滑滚动动画
    - 加载状态优化
