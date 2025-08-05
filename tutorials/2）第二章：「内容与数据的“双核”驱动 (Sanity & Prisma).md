欢迎来到我们旅程的第二章！
在上一章，我们为“数字花园”搭建了一个拥有专业部署流程和独特设计基因的“黄金骨架”。现在，是时候为这个骨架，装上两个最核心的“引擎”了：
1. 数据核心 (Prisma & Postgres): 负责存储所有用户交互数据（如点赞、评论）的“保险库”。
2. 内容核心 (Sanity): 负责承载我们所有富有表现力的创意内容（文章、照片）的“内容中枢”。
准备好了吗？让我们开始构建这两个驱动我们应用未来的强大内核。

## 2.1 搭建数据核心 (Prisma & Postgres)
这是我们应用中所有结构化数据的家。

实战：搭建本地“数据库沙盒” (Docker & Postgres)
专业的开发，始于一个安全、隔离的环境。我们将使用 Docker 在你的本地电脑上，启动一个与线上环境一致的 Postgres 数据库。
1. 安装 Docker Desktop: 如果你还没安装，请从 Docker 官网 下载并安装它。
2. 创建 docker-compose.yml: 在你的项目根目录 (digital-garden-ai/) 下，创建一个新文件 docker-compose.yml，并粘贴以下内容：
```
# docker-compose.yml
    version: '3.8'
    services:
      db:
        image: postgres:15
        restart: always
        environment:
          POSTGRES_USER: myuser
          POSTGRES_PASSWORD: mypassword
          POSTGRES_DB: digitalgarden
        ports:
          - '5432:5432'
        volumes:
          - ./.postgres-data:/var/lib/postgresql/data
```
3. 启动数据库: 在终端里，运行 docker-compose up -d。
常见问题排查: 如果遇到 Cannot connect to the Docker daemon 的错误，这通常意味着你的 Docker Desktop 应用程序没有启动。请先打开它，并等待其稳定运行后再试。
4. 更新 .gitignore: (重要！) 打开你项目根目录的 .gitignore 文件，在末尾追加一行。这能确保我们本地的数据库文件，永远不会被意外地提交到 GitHub。
```
# .gitignore

# ...其他忽略项...

# Docker
.postgres-data
```

实战：定义数据蓝图 (Prisma Schema)
1. 安装 Prisma: pnpm install prisma --save-dev
2. 初始化 Prisma: pnpm prisma init
3. 配置本地数据库连接:
  - 创建 .env.local: 在项目根目录，将 prisma 文件夹旁边自动生成的 .env 文件，重命名为 .env.local。
  - 写入连接字符串: 用以下内容替换该文件的全部内容。
  ```
  # .env.local - 用于本地开发，此文件不提交到 Git
  DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/digitalgarden?schema=public"
  ```
> 专家提示 (Best Practice): 我们坚持使用 .env.local，是因为 Next.js 默认会忽略它，保障密钥安全。但 Prisma CLI 默认不认识它，为了解决这个问题，我们需要下一步的“魔法”。
4. 让 Prisma 读懂 .env.local:
  - 安装 dotenv-cli: pnpm install -D dotenv-cli
  - 配置 package.json: 打开 package.json，找到 scripts 部分，添加几个专门的 Prisma 脚本。
  ```
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "prisma:migrate": "dotenv -e .env.local -- pnpm prisma migrate dev",
    "prisma:studio": "dotenv -e .env.local -- pnpm prisma studio"
  },
  ```
5. 定义数据模型: 打开 prisma/schema.prisma，用我们“多态关联”的最终版 Schema 替换掉原有内容。
  ```
  // prisma/schema.prisma
  generator client {
    provider = "prisma-client-js"
  }

  datasource db {
    provider  = "postgresql"
    url       = env("DATABASE_URL")
  }

  model Collection {
    id          String   @id @default(cuid())
    name        String   @unique
    slug        String   @unique
    description String?  @db.Text
    posts       PostsOnCollections[]
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
  }

  model Post {
    id          String    @id @default(cuid())
    photo       Photo?
    log         Log?
    author      User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
    authorId    String
    likes       Like[]
    comments    Comment[]
    collections PostsOnCollections[]
    createdAt   DateTime  @default(now())
    updatedAt   DateTime  @updatedAt
  }

  model Log {
    id          String    @id @default(cuid())
    post        Post      @relation(fields: [postId], references: [id], onDelete: Cascade)
    postId      String    @unique
    title       String
    publishedAt DateTime?
    tags        String[]
  }

  model Photo {
    id            String @id @default(cuid())
    post          Post   @relation(fields: [postId], references: [id], onDelete: Cascade)
    postId        String @unique
    sanityAssetId String?
  }

  model PostsOnCollections {
    post         Post       @relation(fields: [postId], references: [id], onDelete: Cascade)
    postId       String
    collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
    collectionId String
    assignedAt   DateTime   @default(now())
    assignedBy   String
    @@id([postId, collectionId])
  }

  model User {
    id        String    @id
    email     String    @unique
    name      String?
    avatarUrl String?   @db.Text
    posts     Post[]
    likes     Like[]
    comments  Comment[]
    createdAt DateTime  @default(now())
    updatedAt DateTime  @updatedAt
  }

  model Like {
    id        String   @id @default(cuid())
    post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
    postId    String
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    userId    String
    createdAt DateTime @default(now())
    @@unique([postId, userId])
  }

  model Comment {
    id        String    @id @default(cuid())
    content   String    @db.Text
    post      Post      @relation(fields: [postId], references: [id], onDelete: Cascade)
    postId    String
    user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
    userId    String
    parent    Comment?  @relation("CommentReplies", fields: [parentId], references: [id], onDelete: NoAction, onUpdate: NoAction)
    parentId  String?
    replies   Comment[] @relation("CommentReplies")
    createdAt DateTime  @default(now())
    updatedAt DateTime  @updatedAt
  }
  ```
6. 执行首次迁移: 使用我们新定义的脚本来执行迁移。
`pnpm prisma:migrate -- --name "init-complete-schema"`

## 2.2 搭建内容核心 (Sanity)
这是我们“数字花园”中所有美丽花朵（图片、文章）生长的地方。

实战：初始化与配置
1. 创建 Studio: 在项目文件夹外部，运行 pnpm create sanity@latest。
  >教程：关键选项指引
  >- Project template: 请务必选择 Clean project with no predefined schema types。这会给我们一张干净的“画纸”，让我们能从零开始构建自己的内容模型。
2. 配置 CORS: 前往 manage.sanity.io，选择你的新项目，在 API -> CORS origins 中，添加 http://localhost:3000 并勾选 Allow credentials。
3. 手动创建 development 数据集:
  - 在 Sanity 的项目管理后台，进入 Datasets 标签页。
  - 点击 Add dataset，创建一个名为 development 的、权限为 Public 的新数据集。
  >教程：为何要这样做？ 严格分离生产和开发内容，是专业工作流的基石。这能让你在 development 数据集中自由地测试、创建草稿，而完全不影响线上 production 的内容。

实战：建立内容关联模型
1. 确认文件结构: 进入你新创建的 Sanity Studio 文件夹，确认存在一个 schemaTypes 文件夹。
2. 创建 author.ts:
  ```
  // sanity-studio/schemaTypes/author.ts

  import {defineField, defineType} from 'sanity'

  export default defineType({
    name: 'author',
    title: 'Author',
    type: 'document',
    fields: [
      defineField({
        name: 'name',
        title: 'Name',
        type: 'string',
        validation: (Rule) => Rule.required(),
      }),
      defineField({
        name: 'slug',
        title: 'Slug',
        type: 'slug',
        options: {
          source: 'name',
          maxLength: 96,
        },
        validation: (Rule) => Rule.required(),
      }),
      defineField({
        name: 'image',
        title: 'Image',
        type: 'image',
        options: {
          hotspot: true,
        },
      }),
      defineField({
        name: 'bio',
        title: 'Bio',
        type: 'text',
        rows: 3,
      }),
    ],
    preview: {
      select: {
        title: 'name',
        media: 'image',
      },
    },
  })
  ```
3. 创建 collection.ts:
  ```
  // sanity-studio/schemaTypes/collection.ts

  import {defineField, defineType} from 'sanity'

  export default defineType({
    name: 'collection',
    title: 'Collection', // 在 Studio 中显示为“合集/系列”
    type: 'document',
    fields: [
      // 为国际化插件预留的字段
      defineField({
        name: 'language',
        type: 'string',
        readOnly: true,
        hidden: true,
      }),
      defineField({
        name: 'name',
        title: 'Collection Name',
        type: 'string',
        validation: (Rule) => Rule.required(),
      }),
      defineField({
        name: 'slug',
        title: 'Slug',
        type: 'slug',
        options: {
          source: 'name',
          maxLength: 96,
        },
        validation: (Rule) => Rule.required(),
      }),
      defineField({
        name: 'description',
        title: 'Description',
        type: 'text',
        rows: 4,
      }),
      defineField({
        name: 'coverImage',
        title: 'Cover Image',
        type: 'image',
        options: {
          hotspot: true,
        },
      }),
      // 精选开关
      defineField({
        name: 'isFeatured',
        title: 'Featured on Homepage',
        type: 'boolean',
        description: 'Enable this to feature this collection in the homepage hero section.',
        initialValue: false,
      }),
      // 照片关联
      defineField({
        name: 'photos',
        title: 'Photos in this Collection',
        type: 'array',
        of: [{type: 'reference', to: {type: 'photo'}}],
      }),
    ],
  })
  ```
4. 创建 log.ts:
  ```
  // sanity-studio/schemas/log.ts

  import {defineField, defineType} from 'sanity'

  export default defineType({
    name: 'log',
    title: 'Developer Log',
    type: 'document',
    fields: [
      // 1. 语言字段 (由 i18n 插件自动管理)
      // 这个字段虽然在这里定义，但通常是只读或隐藏的，由插件在后台控制
      defineField({
        name: 'language',
        type: 'string',
        readOnly: true,
        hidden: true,
      }),

      // 2. 核心内容字段
      defineField({
        name: 'title',
        title: 'Title',
        type: 'string',
        validation: (Rule) => Rule.required(),
      }),
      defineField({
        name: 'slug',
        title: 'Slug',
        type: 'slug',
        options: {
          source: 'title',
          maxLength: 96,
        },
        validation: (Rule) => Rule.required(),
      }),
      defineField({
        name: 'publishedAt',
        title: 'Published at',
        type: 'datetime',
        validation: (Rule) => Rule.required(),
      }),
      defineField({
        name: 'mainImage',
        title: 'Main image',
        type: 'image',
        options: {
          hotspot: true, // 开启图片焦点功能
        },
      }),
      defineField({
        name: 'excerpt',
        title: 'Excerpt',
        type: 'text',
        rows: 3,
        description: 'A short summary of the post for social media and previews.',
      }),
      defineField({
        name: 'content',
        title: 'Content',
        type: 'array', // 使用 Portable Text 来实现富文本
        of: [
          {
            type: 'block', // 标准的文本块
          },
          {
            type: 'image', // 允许在内容中插入图片
          },
          // {
          //   type: 'code', // 允许插入代码块 (需要安装 @sanity/code-input 插件)
          // },
        ],
      }),

      // 3. 关联字段
      // 这里的 author 指向的是 Sanity 中另一个 author 类型的文档
      // 以便我们在文章中展示作者信息
      defineField({
        name: 'author',
        title: 'Author',
        type: 'reference', // 类型是“引用”
        to: {type: 'author'},
        validation: (Rule) => Rule.required(),
      }),
    ],

    // 4. 为 Studio 编辑界面提供更好的预览
    preview: {
      select: {
        title: 'title',
        author: 'author.name',
        media: 'mainImage',
      },
      prepare(selection) {
        const {author} = selection
        return {...selection, subtitle: author && `by ${author}`}
      },
    },
  })
  ```
5. 创建photo.ts
  ```
  // sanity-studio/schemaTypes/photo.ts

  import {defineField, defineType} from 'sanity'

  export default defineType({
    name: 'photo',
    title: 'Photo',
    type: 'document',
    fields: [
      // 移除language字段，不再需要
      defineField({
        name: 'imageFile',
        title: 'Image File',
        type: 'image',
        options: {
          hotspot: true,
        },
        validation: (Rule) => Rule.required(),
      }),

      // 多语言标题
      defineField({
        name: 'title',
        title: 'Title',
        type: 'object',
        fields: [
          {
            name: 'zh',
            title: '中文标题',
            type: 'string',
          },
          {
            name: 'en',
            title: 'English Title',
            type: 'string',
          },
        ],
        validation: (Rule) => Rule.required(),
      }),

      // 多语言描述
      defineField({
        name: 'description',
        title: 'Description',
        type: 'object',
        fields: [
          {
            name: 'zh',
            title: '中文描述',
            type: 'text',
            rows: 3,
          },
          {
            name: 'en',
            title: 'English Description',
            type: 'text',
            rows: 3,
          },
        ],
      }),
    ],

    preview: {
      select: {
        title_zh: 'title.zh',
        title_en: 'title.en',
        oldTitle: 'title', // 兼容旧格式
        media: 'imageFile',
      },
      prepare(selection) {
        const {title_zh, title_en, oldTitle, media} = selection
        // 兼容新旧格式
        const displayTitle = title_zh || title_en || oldTitle || 'Untitled Photo'
        // const subtitle = title_zh && title_en ? `${title_en} / ${title_zh}` : ''
        const subtitle = title_en

        return {
          title: displayTitle,
          subtitle,
          media,
        }
      },
    },
  })
  ```
6. 更新 index.ts:
  ```
  // sanity-studio/schemaTypes/index.ts
  import log from './log'
  import author from './author'
  import collection from './collection'
  import photo from './photo'

  export const schemaTypes = [log, author, collection, photo]
  ```
7. 配置 i18n 插件: 打开 sanity.config.ts，导入并配置 documentInternationalization 插件，确保 schemaTypes 数组中包含了 log 和 collection。
  ```
  // sanity.config.ts
  import {defineConfig} from 'sanity'
  import {structureTool} from 'sanity/structure'
  import {visionTool} from '@sanity/vision'
  import {schemaTypes} from './schemaTypes'
  import {documentInternationalization} from '@sanity/document-internationalization'

  export default defineConfig({
    name: 'default',
    title: 'digital-garden-sanity',

    projectId: 'rmgc6o8r',
    dataset: 'development',

    plugins: [
      structureTool(),
      visionTool(),
      documentInternationalization({
        supportedLanguages: [
          {id: 'en', title: 'English'},
          {id: 'zh', title: 'Chinese'},
        ],
        // 移除photo，只保留真正需要文档级国际化的类型
        schemaTypes: ['log', 'collection'],
      }),
    ],

    schema: {
      types: schemaTypes,
    },
  })
  ```
> 教程：这是如何运作的？document-internationalization 插件的魔法在于：
> - 它会在你的 Studio UI 中，为支持多语言的文档，添加一个语言选择器和“创建翻译”的按钮。
> - 它利用了我们刚刚添加的 language 字段，来标记每个文档的语言归属。
> - 当你“创建翻译”时，它会在后台为你复制一份文档，并在这两个文档之间建立一个隐藏的关联。
> - 这使得我们在前端，可以通过 language 字段，轻松地用 GROQ 查询到特定语言版本的内容。这是一种极其优雅且强大的“关联文档”模式。

本章实操验证
1. 数据库: 运行 pnpm prisma:studio，你应该能看到一个网页版的数据库管理工具，其中包含了我们定义的所有数据表。
2. 内容后台: 在 digital-garden-sanity 文件夹下运行 pnpm dev，访问 localhost:3333。你应该能看到一个功能完备的后台，并且可以创建 "Developer Log", "Author", 和 "Collection" 这三种类型的内容。
至此，我们已经为我们的应用，成功地构建了两个独立、强大且支持未来扩展的“数据与内容核心”。