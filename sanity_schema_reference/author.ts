// sanity-studio/schemaTypes/author.ts

import {defineField, defineType} from 'sanity'
import {simplePortableTextConfig} from './shared/portableTextConfig'

export default defineType({
  name: 'author',
  title: 'Author',
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
      title: 'Name',
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
        source: 'name',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      group: 'content',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'object',
      group: 'content',
      fields: [
        {
          name: 'zh',
          title: '中文简介',
          type: 'array',
          of: simplePortableTextConfig,
          description: '中文版本的个人简介，支持富文本格式',
        },
        {
          name: 'en',
          title: 'English Bio',
          type: 'array',
          of: simplePortableTextConfig,
          description: 'English version of the bio with rich text support',
        },
      ],
      description: 'Multilingual bio with rich text support',
    }),

    // SEO 字段组
    defineField({
      name: 'metaTitle',
      title: 'Meta Title',
      type: 'object',
      group: 'seo',
      fields: [
        {
          name: 'zh',
          title: '中文 Meta Title',
          type: 'string',
          description: '页面标题，建议 50-60 字符',
          validation: (Rule) => Rule.max(60).warning('建议不超过 60 个字符'),
        },
        {
          name: 'en',
          title: 'English Meta Title',
          type: 'string',
          description: 'Page title, recommended 50-60 characters',
          validation: (Rule) => Rule.max(60).warning('Recommended to keep under 60 characters'),
        },
      ],
      description: 'SEO 页面标题，如果为空则使用作者姓名',
    }),

    defineField({
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'object',
      group: 'seo',
      fields: [
        {
          name: 'zh',
          title: '中文 Meta Description',
          type: 'text',
          rows: 3,
          description: '页面描述，建议 150-160 字符',
          validation: (Rule) => Rule.max(160).warning('建议不超过 160 个字符'),
        },
        {
          name: 'en',
          title: 'English Meta Description',
          type: 'text',
          rows: 3,
          description: 'Page description, recommended 150-160 characters',
          validation: (Rule) => Rule.max(160).warning('Recommended to keep under 160 characters'),
        },
      ],
      description: 'SEO 页面描述，如果为空则使用简介的前 160 个字符',
    }),

    defineField({
      name: 'focusKeyword',
      title: 'Focus Keyword',
      type: 'object',
      group: 'seo',
      fields: [
        {
          name: 'zh',
          title: '中文关键词',
          type: 'string',
          description: '主要关键词，用于 SEO 优化',
        },
        {
          name: 'en',
          title: 'English Keyword',
          type: 'string',
          description: 'Primary keyword for SEO optimization',
        },
      ],
      description: '页面的主要关键词',
    }),

    defineField({
      name: 'socialImage',
      title: 'Social Media Image',
      type: 'image',
      group: 'seo',
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alternative text',
          description: 'Important for SEO and accessibility',
        },
      ],
      description: '社交媒体分享图片，如果为空则使用作者头像',
    }),

    defineField({
      name: 'canonicalUrl',
      title: 'Canonical URL',
      type: 'url',
      group: 'seo',
      description: '规范 URL，用于避免重复内容问题',
    }),

    defineField({
      name: 'noIndex',
      title: 'No Index',
      type: 'boolean',
      group: 'seo',
      description: '是否阻止搜索引擎索引此页面',
      initialValue: false,
    }),

    defineField({
      name: 'socialLinks',
      title: 'Social Links',
      type: 'array',
      group: 'seo',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'platform',
              title: 'Platform',
              type: 'string',
              options: {
                list: [
                  {title: 'Twitter', value: 'twitter'},
                  {title: 'LinkedIn', value: 'linkedin'},
                  {title: 'GitHub', value: 'github'},
                  {title: 'Website', value: 'website'},
                  {title: 'Email', value: 'email'},
                  {title: 'Other', value: 'other'},
                ],
              },
            },
            {
              name: 'url',
              title: 'URL',
              type: 'url',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'label',
              title: 'Label',
              type: 'string',
              description: '显示标签（可选）',
            },
          ],
          preview: {
            select: {
              title: 'platform',
              subtitle: 'url',
            },
          },
        },
      ],
      description: '社交媒体链接，用于结构化数据和社交媒体优化',
    }),
  ],
  preview: {
    select: {
      title: 'name',
      media: 'image',
    },
  },
})
