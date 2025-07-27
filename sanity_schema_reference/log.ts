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

    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        layout: 'tags',
      },
    }),

    // 3. 关联字段
    // 这里的 author 指向的是 Sanity 中另一个 author 类型的文档
    // 以便我们在文章中展示作者信息
    // defineField({
    //   name: 'author',
    //   title: 'Author',
    //   type: 'reference', // 类型是“引用”
    //   to: {type: 'author'},
    //   validation: (Rule) => Rule.required(),
    // }),
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
