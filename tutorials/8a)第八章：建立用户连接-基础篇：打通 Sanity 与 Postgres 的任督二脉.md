# 第八章：建立用户连接-准备篇：打通 Sanity 与 Postgres 的任督二脉

## 说在前面：当 Headless CMS 遇到“状态”
欢迎来到第八章！在前七章的冒险中，我们已经为“数字花园”构建了坚不可摧的“骨架”和富有生命力的“血肉”。它拥有了优雅的设计、全球化的视野和流畅的交互。但现在，是时候为它注入真正的“灵魂”了——用户连接。

在现代独立开发的世界里，我们追求极致的开发效率与卓越的用户体验。Headless CMS (如 Sanity) 赋予了我们无与伦比的内容管理灵活性，而强大的数据库 (如 Postgres) 则是应用状态与用户数据的坚实基石。然而，当我们需要将两者结合，让静态内容“活”起来，拥有点赞、评论等社交能力时，真正的挑战才刚刚开始。

这个章节作为“准备篇”，我们将直面一个在实际项目中极具代表性的复杂场景：如何将 Sanity 中管理的、且涉及复杂国际化（i18n）场景的内容，与 Postgres 数据库进行实时、可靠的同步。这不仅仅是技术上的连接，更是两种不同数据哲学——文档模型与关系模型的深度对话。


## 本章目标
1.  建立机制化关联：构建一个由 Sanity Webhook 驱动，Next.js API Route 处理，最终通过 Prisma 操作 Postgres 的自动化数据同步管道。
2.  攻克国际化难题：深入解决在使用 Sanity 国际化插件（`@sanity/document-internationalization`）时，如何将不同语言的“副本”内容正确映射到数据库中唯一的记录上。
3.  实现社交功能基础：为 Photo 和 Log 内容类型打下数据基础，使其能够承载点赞、评论等社交互动数据。
4.  交付完整解决方案：提供从 Schema 设计、Webhook 处理器代码，到一次性数据回填脚本的完整、可落地的解决方案。


## 问题挑战：当文档模型遇到关系模型
在动手之前，我们先理解问题的核心复杂度：

1.  模型不匹配 (Impedance Mismatch)：Sanity 是一个基于文档的 NoSQL 系统，数据结构灵活；而 Postgres 是一个关系型数据库，结构严谨。我们需要设计一个中间层（在 Prisma Schema 中体现），既能保留内容的灵活性，又能利用关系模型的强大能力。
2.  国际化（i18n）的“巨坑”：
    字段级 i18n vs 文档级 i18n：项目中同时存在两种 i18n 策略。`Photo` 类型在单个文档内通过 `title.en`、`title.zh` 实现字段级翻译；而 `Log` 和 `Collection` 则使用插件，为每种语言创建一个独立的 Sanity 文档。这个插件会在后台将这些互为翻译的文档用一个隐藏的 `i18n_id` 关联起来，而这正是问题的关键所在。
    数据一致性与竞争条件：当你在 Sanity 中快速创建或更新一个内容和它的翻译版本时，会触发多个 Webhook 请求。我们的系统必须具备幂等性，并能正确处理这些（可能是并发的）请求，确保它们最终只对应数据库中的一条核心记录，而不是创建出重复的数据。


## 实现路径

### 第一步：数据模型的“握手” - Schema 设计与重构
这里使用了抽象与继承的设计思想。在 `prisma/schema.prisma` 中，我们定义了一个核心的 `Post` 模型，它承载了所有内容类型共有的属性，比如 `id`、`sanityDocumentId`、`contentType` 以及社交计数器 `likes` 和 `comments`。

然后，`Photo` 和 `Log` 模型通过一对一关系“继承”`Post`，扩展出各自特有的字段。
```prisma:prisma/schema.prisma
// 核心抽象模型：帖子
model Post {
  id               String      @id @default(cuid())
  sanityDocumentId String      @unique // Sanity 文档 ID 或 翻译组 ID
  contentType      String      // 'photo' or 'log'
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
  authorId         String
  author           User        @relation(fields: [authorId], references: [id])
  likes            Like[]
  comments         Comment[]
  collections      CollectionOnPost[]

  // 关系字段
  photo Photo? // 一对一到 Photo
  log   Log?   // 一对一到 Log
}

// Photo 模型
model Photo {
  id              String   @id @default(cuid())
  postId          String   @unique
  post            Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  sanityDocumentId String   @unique
  titleJson       Json     // {"en": "Title", "zh": "标题"}
  descriptionJson Json     // {"en": "Description", "zh": "描述"}
  // ... 其他 photo 特有字段
}

// Log 模型
model Log {
  id               String   @id @default(cuid())
  postId           String   @unique
  post             Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  sanityDocumentId String   @unique
  language         String   // 'en' or 'zh'
  title            String
  slug             String
  // ... 其他 log 特有字段

  @@unique([postId, language]) // 确保一个 Post 每种语言只有一个 Log 版本
}
```

> 关键决策：`Post.sanityDocumentId` 字段是整个同步逻辑的核心。对于未使用 i18n 插件的 `Photo`，它存储的是 Sanity 文档自身的 `_id`。而对于使用了 i18n 插件的 `Log`，它最终必须存储翻译组的 ID (`i18n_id`)，从而将所有语言版本的 `Log` 都关联到同一个 `Post` 上。

### 第二步：搭建 Webhook 桥梁
我们在 `app/api/webhooks/sanity-sync/route.ts` 中创建了一个 API Route 来接收和处理来自 Sanity 的 Webhook。

它的核心职责包括：
1.  安全校验：使用 `sanity-webhook` 库来验证请求的签名，确保它确实来自我们的 Sanity 项目。
2.  请求解析：解析请求体，判断是创建 (`create`)、更新 (`update`) 还是删除 (`delete`) 操作。
3.  逻辑分发：根据内容的 `_type` (`photo`, `log`, `collection`)，将处理逻辑分发给相应的函数（如 `handlePhotoCreate`, `handleLogUpdate` 等）。

### 第三步：攻克国际化迷宫（核心难点）
这是我们投入最多精力、也是最有价值的部分。`Log` 类型的同步逻辑远比 `Photo` 复杂。

> 最初的陷阱：我们天真地以为，每次收到 `Log` 的 Webhook 时，只要用 `body.documentId` 和 `i18n_id` 就能判断一切。
> 但现实是残酷的：当你创建第一个语言版本（如中文）时，翻译元数据（`translation.metadata`）可能还未创建，导致 `getI18nInfo` 无法立即获取到 `i18n_id`。
> 此时，系统会用中文 Log 自己的 `_id` 创建一个 `Post`。
> 紧接着，你创建并关联英文版。Webhook 触发，这次 `getI18nInfo` 成功获取到了 `i18n_id`。但它去数据库里用这个 `i18n_id` 查找 `Post` 时，却找不到——因为数据库里存的是中文 Log 的 `_id`！
> 结果：系统又为英文版创建了一个新的 `Post`，导致数据重复。

最终的解决方案：一个更具鲁棒性的合并策略

我们重构了核心的 `getI18nInfo` 和 `consolidateLogI18nRecords` 函数。

1.  `getI18nInfo` 的增强：
    这个函数不再只返回 `i18n_id`，而是返回一个包含翻译组内所有相关文档 ID (`related_document_ids`) 的对象。这样，无论当前 Webhook 是由哪个语言版本触发的，我们都能拿到它所有“兄弟”的 ID。

    ```typescript:app/api/webhooks/sanity-sync/route.ts
    async function getI18nInfo(documentId: string): Promise<{
      i18n_id: string
      i18n_lang: string | null
      related_document_ids: string[]
    }> {
      // ... GROQ 查询逻辑 ...
      const query = `
        {
          "i18n_metadata": *[_type == "translation.metadata" && $documentId in translations[].value._ref][0] {
            "i18n_id": _id,
            "related_document_ids": translations[].value._ref
          },
          "i18n_lang": *[_id==$documentId][0].language
        }
      `
      // ... 错误处理和回退逻辑 ...
    }
    ```

2.  `consolidateLogI18nRecords` 的重构：
    这是整个同步逻辑的大脑。它接收 `i18n_id` 和 `related_document_ids`，然后执行以下原子操作（在 `prisma.$transaction` 中）：

    第一步：查找。它不再只用 `i18n_id` 查找 `Post`，而是用 `[i18n_id, ...related_document_ids]` 这个 ID 集合去数据库里捞，只要能找到任何一个匹配的 `Post` 记录，就认为找到了组织。
    第二步：迁移。如果找到的 `Post` 的 `sanityDocumentId` 还不是标准的 `i18n_id`（说明它是由第一个语言版本创建的），就立即更新它，将其 `sanityDocumentId` “扶正”为 `i18n_id`。
    第三步：决策。检查当前语言版本的 `Log` 是否已经存在。如果不存在，则返回 `shouldCreateLog: true`。
    第四步：创建。如果第一步完全没找到任何 `Post`，说明这是这个翻译组的第一个成员，那就用 `i18n_id` 创建一个新的 `Post`。

    ```typescript:app/api/webhooks/sanity-sync/route.ts
    async function consolidateLogI18nRecords(
      i18n_id: string,
      related_document_ids: string[],
      language: string
    ): Promise<{ postId: string; shouldCreateLog: boolean }> {
      return await prisma.$transaction(async (tx) => {
        // 1. Find an existing post using either the i18n_id or any of the related document IDs
        let existingPost = await tx.post.findFirst({
          where: {
            sanityDocumentId: {
              in: [i18n_id, ...related_document_ids],
            },
          },
        })

        if (existingPost) {
          // 2. If the post is not using the main i18n_id, update it
          if (existingPost.sanityDocumentId !== i18n_id) {
            existingPost = await tx.post.update({
              where: { id: existingPost.id },
              data: { sanityDocumentId: i18n_id },
            })
          }

          // 3. Check if a log entry for this language already exists
          const existingLog = await tx.log.findUnique({ /* ... */ })
          return { postId: existingPost.id, shouldCreateLog: !existingLog }
        }

        // 4. No existing post found, create a new one with the main i18n_id
        const newPost = await tx.post.create({ /* ... */ })
        return { postId: newPost.id, shouldCreateLog: true }
      })
    }
    ```

这个策略优雅地解决了竞争条件和数据不一致的问题，无论哪个语言版本的 Webhook 先到，都能保证数据被正确地合并到唯一的 `Post` 记录上。

### 第四步：历史数据的“回填”
对于已经存在于 Sanity 中的内容，我们需要一个一次性的脚本来将它们同步到 Postgres。我们创建了 `scripts/backfill-sanity-to-postgres.js` 来完成这个任务。该脚本会遍历 Sanity 中的所有 `photo` 和 `log`，并调用与 Webhook 处理器中相同的逻辑来创建数据库记录。

### 第五步：配置 Sanity Webhook
1.  登录 `manage.sanity.io`，进入你的项目。
2.  导航到 `API` -> `Webhooks`。
3.  点击 `Create webhook`。
4.  Name: `Postgres Sync` (或任何你喜欢的名字)。
5.  URL: 你的 Next.js 应用部署后，Webhook API 的公开 URL (例如 `https://your-app.vercel.app/api/webhooks/sanity-sync`)。
6.  Dataset: 选择 `production`。
7.  Trigger on: 勾选 `Create`, `Update`, `Delete`。
8.  Filter: 留空以监听所有文档类型，或填写 `_type in ['photo', 'log', 'collection']` 来精确监听。
9.  Secret: 生成一个足够复杂的密钥，并将其配置在你的 Next.js 应用的环境变量 `SANITY_WEBHOOK_SECRET` 中。
10. 保存 Webhook。


## 重点回顾与“避坑”指南
- 幂等性是生命线：Webhook 处理器必须设计成幂等的。即使用相同的输入重复调用，结果也应该是一致的。我们的 `consolidateLogI18nRecords` 函数通过反复检查记录是否存在来保证幂等性。
- 拥抱原子事务：对于需要同时操作多张表（如 `Post` 和 `Log`）的场景，务必使用 `prisma.$transaction` 来保证数据的一致性。
- 日志，日志，还是日志：在处理这种跨系统的异步通信时，详尽的日志是你的救命稻草。在关键步骤（如收到 Webhook、开始处理、查找记录、创建/更新数据、遇到错误）都添加明确的日志，能让你在出现问题时快速定位。
- 不要相信时序：永远不要假设 Webhook 会按照你操作的顺序到达。网络延迟、服务重试都可能打乱顺序。你的逻辑必须能处理乱序的请求。


## 最终交付成果
经过这一番努力，我们最终交付了一套完整的、健壮的解决方案：

1.  一套演进后的 Schema 定义：清晰地划分了核心 `Post` 与具体内容类型 `Photo`、`Log` 的关系。
2.  一个高度优化的 Webhook 处理器：位于 `app/api/webhooks/sanity-sync/route.ts`，能够智能、可靠地处理包括复杂 i18n 场景在内的内容同步。
3.  清晰的 Webhook 配置指引：确保 Sanity 与我们的应用能够安全、正确地通信。
4.  一个实用的数据回填脚本：解决了历史数据的迁移问题。

现在，我们的数字花园拥有了坚实的数据底座。在此之上，实现点赞、评论等具体的社交功能，将是下一章的精彩内容。