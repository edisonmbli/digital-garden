### **第二章 v2.0：「内容与数据的“双核”驱动 (Sanity & Prisma)**

**章节目标**:
在这一章，我们将为“数字花园”构建两个最核心的“引擎”。我们将搭建好本地的数据库环境，并通过 Prisma 定义好承载用户交互数据的“骨架”；同时，我们也会初始化 Sanity，为我们所有富有表现力的内容（文章、照片）建立一个强大、且支持国际化的“内容中枢”。

-----

#### **2.1 搭建数据核心 (Prisma & Postgres)**

这是我们应用中，负责存储用户点赞、评论等结构化数据的“保险库”，也是所有社区交互功能的地基。

##### **实战：搭建本地“数据库沙盒” (Docker & Postgres)**

专业的开发，始于一个安全、隔离的环境。我们将使用 Docker 在你的本地电脑上，启动一个与线上环境一致的 Postgres 数据库。

1.  **安装 Docker Desktop**: 如果你还没安装，请从 [Docker 官网](https://www.docker.com/products/docker-desktop/) 下载并安装它。

2.  **创建 `docker-compose.yml`**: 在你的项目根目录 (`digital-garden-ai/`) 下，创建一个新文件 `docker-compose.yml`，并粘贴以下内容：

    ```yaml
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

3.  **启动数据库**: 在终端里，运行 `docker-compose up -d`。Docker 会在后台为你启动这个数据库容器。

    > **问题排查**: 如果遇到 `Cannot connect to the Docker daemon` 的错误，请确保你的 Docker Desktop 应用程序已经完全启动并正在后台运行。

4.  **更新 `.gitignore`**: **(重要！)** 打开你项目根目录的 `.gitignore` 文件，在末尾追加一行，确保我们本地的数据库文件不会被提交到 GitHub。

    ```
    # .gitignore

    # ...其他忽略项...

    # Docker
    .postgres-data
    ```

##### **实战：定义数据蓝图 (Prisma Schema)**

1.  **安装 Prisma**: `pnpm install prisma --save-dev`
2.  **初始化 Prisma**: `pnpm prisma init`
3.  **配置本地数据库连接**:
      * **创建 `.env.local`**: 在项目根目录，将 `prisma` 文件夹旁边自动生成的 `.env` 文件，**重命名为 `.env.local`**。
      * **写入连接字符串**: 用以下内容替换该文件的全部内容。
        ```env
        # .env.local - 用于本地开发，此文件不提交到 Git
        DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/digitalgarden?schema=public"
        ```
4.  **定义最终版数据模型**: 打开 `prisma/schema.prisma`，用我们“多态关联”的最终版 Schema 替换掉原有内容。
    ```prisma
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
5.  **执行首次迁移**:
      * **安装 `dotenv-cli`**: `pnpm install -D dotenv-cli`
      * **配置 `package.json`**:
        ```json
        "scripts": {
          "dev": "next dev",
          "build": "next build",
          "start": "next start",
          "lint": "next lint",
          "prisma:migrate": "dotenv -e .env.local -- pnpm prisma migrate dev",
          "prisma:studio": "dotenv -e .env.local -- pnpm prisma studio"
        },
        ```
      * **运行迁移**: `pnpm prisma:migrate -- --name "init-complete-schema"`
          * 这条命令会读取你的 `.env.local`，连接到本地数据库，并创建所有数据表。

-----

#### **2.2 搭建内容核心 (Sanity)**

这是我们“数字花园”中所有美丽花朵（图片、文章）生长的地方。

##### **实战：初始化与配置**

1.  **创建 Studio**: 在你的项目文件夹**外部**，运行 `pnpm create sanity@latest`。

      * **关键选项**: 登录后，当被问到项目模板时，请选择 **`Clean project with no predefined schema types`**。当被问到包管理器时，选择 `pnpm`。

2.  **配置 CORS**: 前往 `manage.sanity.io`，选择你的新项目，在 `API` -\> `CORS origins` 中，添加 `http://localhost:3000` 并勾选 `Allow credentials`。

3.  **手动创建 `development` 数据集**:

      * 在 Sanity 的项目管理后台，进入 `Datasets` 标签页。
      * 点击 `Add dataset`，创建一个名为 `development` 的、权限为 `Public` 的新数据集。

##### **实战：建立内容关联模型**

1.  **确认文件结构**: 进入你新创建的 Sanity Studio 文件夹，确认存在一个 `schemaTypes` 文件夹。我们将在这里定义我们所有的内容模型。

2.  **创建 `author.ts`**:

    ```typescript
    // sanity-studio/schemaTypes/author.ts
    import { defineField, defineType } from 'sanity'
    export default defineType({
      name: 'author',
      title: 'Author',
      type: 'document',
      fields: [ /* ... a name, slug, image, and bio fields ... */ ]
    })
    ```

3.  **创建 `collection.ts`**:

    ```typescript
    // sanity-studio/schemaTypes/collection.ts
    import { defineField, defineType } from 'sanity'
    export default defineType({
      name: 'collection',
      title: 'Collection',
      type: 'document',
      fields: [ /* ... language, name, slug, description, coverImage ... */ ]
    })
    ```

4.  **创建 `log.ts`**:

    ```typescript
    // sanity-studio/schemaTypes/log.ts
    import { defineField, defineType } from 'sanity'
    export default defineType({
      name: 'log',
      title: 'Developer Log',
      type: 'document',
      fields: [
        defineField({ name: 'language', type: 'string', readOnly: true, hidden: true }),
        defineField({ name: 'title', type: 'string', validation: (Rule) => Rule.required() }),
        defineField({ name: 'slug', type: 'slug', options: { source: 'title' } }),
        defineField({ name: 'publishedAt', type: 'datetime' }),
        defineField({ name: 'author', type: 'reference', to: [{ type: 'author' }] }), // 注意这里的数组语法
        defineField({ name: 'content', type: 'array', of: [{ type: 'block' }, { type: 'image' }] }),
        // ...其他字段...
      ],
    })
    ```

5.  **更新 `index.ts`**

    ```typescript
    // sanity-studio/schemaTypes/index.ts
    import log from './log'
    import author from './author'
    import collection from './collection'

    export const schemaTypes = [log, author, collection]
    ```

6.  **配置 i18n 插件**: 打开 `sanity.config.ts`，导入并配置 `documentInternationalization` 插件，确保 `schemaTypes` 数组中包含了 `log` 和 `collection`。

    ```typescript
    // sanity.config.ts
    // ...
    import { documentInternationalization } from '@sanity/document-internationalization'
    // ...
    plugins: [
      // ...
      documentInternationalization({
        supportedLanguages: [
          { id: 'en', title: 'English' },
          { id: 'zh', title: 'Chinese' }
        ],
        schemaTypes: ['log', 'collection'],
      }),
    ],
    // ...
    ```

-----

**本章实操验证**

1.  **数据库**: 运行 `pnpm prisma:studio`，你应该能看到一个网页版的数据库管理工具，其中包含了我们定义的所有数据表。
2.  **内容后台**: 在 `digital-garden-sanity` 文件夹下运行 `pnpm dev`，访问 `localhost:3333`。你应该能看到一个功能完备的后台，并且可以创建 "Developer Log", "Author", 和 "Collection" 这三种类型的内容。

至此，我们已经为我们的应用，成功地构建了两个独立、强大且支持未来扩展的“数据与内容核心”。