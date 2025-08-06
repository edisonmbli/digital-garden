// sanity-studio/schemaTypes/collection.ts

import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'collection',
  title: 'Collection', // 在 Studio 中显示为"合集/系列"
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
    defineField({
      name: 'name',
      title: 'Collection Name',
      type: 'object',
      group: 'content',
      fields: [
        {
          name: 'en',
          title: 'English',
          type: 'string',
          validation: (Rule) => Rule.required(),
        },
        {
          name: 'zh',
          title: '中文',
          type: 'string',
          validation: (Rule) => Rule.required(),
        },
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: {
        source: 'name.en',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'object',
      group: 'content',
      fields: [
        {
          name: 'en',
          title: 'English',
          type: 'text',
          rows: 4,
        },
        {
          name: 'zh',
          title: '中文',
          type: 'text',
          rows: 4,
        },
      ],
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      group: 'content',
      options: {
        hotspot: true,
      },
    }),
    // 精选开关
    defineField({
      name: 'isFeatured',
      title: 'Featured on Homepage',
      type: 'boolean',
      group: 'content',
      description: 'Enable this to feature this collection in the homepage hero section.',
      initialValue: false,
    }),
    // 照片关联
    defineField({
      name: 'photos',
      title: 'Photos in this Collection',
      type: 'array',
      group: 'content',
      of: [{type: 'reference', to: {type: 'photo'}}],
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
          type: 'object',
          description: '推荐长度：50-60字符，用于搜索引擎结果页面标题',
          fields: [
            {
              name: 'en',
              title: 'English',
              type: 'string',
              validation: (Rule) => Rule.max(60).warning('建议保持在60字符以内以获得最佳SEO效果'),
            },
            {
              name: 'zh',
              title: '中文',
              type: 'string',
              validation: (Rule) => Rule.max(60).warning('建议保持在60字符以内以获得最佳SEO效果'),
            },
          ],
        },
        {
          name: 'metaDescription',
          title: 'Meta Description',
          type: 'object',
          description: '推荐长度：150-160字符，简洁描述页面内容，显示在搜索结果中',
          fields: [
            {
              name: 'en',
              title: 'English',
              type: 'text',
              rows: 3,
              validation: (Rule) => Rule.max(160).warning('建议保持在160字符以内以获得最佳SEO效果'),
            },
            {
              name: 'zh',
              title: '中文',
              type: 'text',
              rows: 3,
              validation: (Rule) => Rule.max(160).warning('建议保持在160字符以内以获得最佳SEO效果'),
            },
          ],
        },
        {
          name: 'focusKeyword',
          title: 'Focus Keyword',
          type: 'object',
          description: '主要关键词，用于内容优化指导',
          fields: [
            {
              name: 'en',
              title: 'English',
              type: 'string',
            },
            {
              name: 'zh',
              title: '中文',
              type: 'string',
            },
          ],
        },
        {
          name: 'socialImage',
          title: 'Social Media Image',
          type: 'image',
          description: '推荐尺寸：1200x630px，用于社交媒体分享时的预览图',
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
      ],
    }),
    // 排序字段 - orderable-document-list 插件需要使用 orderRank 字段名
    defineField({
      name: 'orderRank',
      title: 'Order Rank',
      type: 'string',
      description: 'Used by the orderable document list plugin for drag-and-drop sorting.',
      hidden: true, // 隐藏此字段，因为排序通过拖拽完成
    }),
  ],
  preview: {
    select: {
      name_zh: 'name.zh',
      name_en: 'name.en',
      oldName: 'name', // 兼容旧格式
      media: 'coverImage',
      isFeatured: 'isFeatured',
    },
    prepare(selection) {
      const {name_zh, name_en, oldName, media, isFeatured} = selection
      // 兼容新旧格式
      const displayName = name_zh || name_en || oldName || 'Untitled Collection'
      const subtitle = name_en && name_zh ? `${name_en}` : ''
      const featuredIndicator = isFeatured ? ' ⭐' : ''

      return {
        title: displayName + featuredIndicator,
        subtitle,
        media,
      }
    },
  },
})
