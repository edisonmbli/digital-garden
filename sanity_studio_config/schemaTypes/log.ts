// sanity-studio/schemaTypes/log.ts

import {defineField, defineType} from 'sanity'
import {fullPortableTextConfig} from './shared/portableTextConfig'

export default defineType({
  name: 'log',
  title: 'Developer Log',
  type: 'document',
  groups: [
    {
      name: 'content',
      title: 'Content',
      default: true,
    },
    {
      name: 'seo',
      title: 'SEO',
    },
  ],
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
      group: 'content',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
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
      group: 'content',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'mainImage',
      title: 'Main image',
      type: 'image',
      group: 'content',
      options: {
        hotspot: true, // 开启图片焦点功能
      },
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      group: 'content',
      rows: 3,
      description: 'A short summary of the post for social media and previews.',
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      group: 'content',
      of: fullPortableTextConfig,
      description: 'Rich text content with support for images, code blocks, formatting, and custom components',
    }),

    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      group: 'content',
      of: [{type: 'string'}],
      options: {
        layout: 'tags',
      },
    }),

    // SEO 字段组
    defineField({
      name: 'seo',
      title: 'SEO Settings',
      type: 'object',
      group: 'seo',
      options: {
        collapsible: true,
        collapsed: false,
      },
      fields: [
        {
          name: 'metaTitle',
          title: 'Meta Title',
          type: 'string',
          description: '推荐长度：50-60字符，用于搜索引擎结果页面标题。如果留空，将使用文章标题',
          validation: (Rule) => Rule.max(60).warning('建议保持在60字符以内以获得最佳SEO效果'),
        },
        {
          name: 'metaDescription',
          title: 'Meta Description',
          type: 'text',
          rows: 3,
          description: '推荐长度：150-160字符，简洁描述页面内容，显示在搜索结果中。如果留空，将使用文章摘要',
          validation: (Rule) => Rule.max(160).warning('建议保持在160字符以内以获得最佳SEO效果'),
        },
        {
          name: 'focusKeyword',
          title: 'Focus Keyword',
          type: 'string',
          description: '主要关键词，用于内容优化指导',
        },
        {
          name: 'socialImage',
          title: 'Social Media Image',
          type: 'image',
          description: '推荐尺寸：1200x630px，用于社交媒体分享时的预览图。如果留空，将使用主图片',
          options: {
            hotspot: true,
          },
        },
        {
          name: 'canonicalUrl',
          title: 'Canonical URL',
          type: 'url',
          description: '规范URL，用于避免重复内容问题（可选）',
        },
        {
          name: 'noIndex',
          title: 'No Index',
          type: 'boolean',
          description: '启用后，搜索引擎将不会索引此页面',
          initialValue: false,
        },
        {
          name: 'readingTime',
          title: 'Estimated Reading Time',
          type: 'number',
          description: '预估阅读时间（分钟），可自动计算或手动设置',
        },
      ],
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
