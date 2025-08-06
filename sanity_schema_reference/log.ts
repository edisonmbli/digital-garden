// sanity-studio/schemas/log.ts

import {defineField, defineType} from 'sanity'

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
      type: 'array', // 使用 Portable Text 来实现富文本
      group: 'content',
      of: [
        {
          type: 'block', // 标准的文本块
          // 自定义样式
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'H1', value: 'h1'},
            {title: 'H2', value: 'h2'},
            {title: 'H3', value: 'h3'},
            {title: 'H4', value: 'h4'},
            {title: 'H5', value: 'h5'},
            {title: 'H6', value: 'h6'},
            {title: 'Quote', value: 'blockquote'},
          ],
          // 列表类型
          lists: [
            {title: 'Bullet', value: 'bullet'},
            {title: 'Numbered', value: 'number'},
          ],
          // 文本装饰器（inline 样式）
          marks: {
            // 基础装饰器
            decorators: [
              {title: 'Strong', value: 'strong'},
              {title: 'Emphasis', value: 'em'},
              {title: 'Code', value: 'code'},
              {title: 'Underline', value: 'underline'},
              {title: 'Strike', value: 'strike-through'},
              // 自定义高亮装饰器
              {
                title: 'Highlight',
                value: 'highlight',
                icon: () => '🖍️',
              },
              {
                title: 'Important',
                value: 'important',
                icon: () => '⚠️',
              },
            ],
            // 注释（annotations）- 用于更复杂的样式
            annotations: [
              // 链接
              {
                title: 'URL',
                name: 'link',
                type: 'object',
                fields: [
                  {
                    title: 'URL',
                    name: 'href',
                    type: 'url',
                  },
                  {
                    title: 'Open in new tab',
                    name: 'blank',
                    type: 'boolean',
                  },
                ],
              },
              // 文字颜色
              {
                title: 'Text Color',
                name: 'color',
                type: 'object',
                icon: () => '🎨',
                fields: [
                  {
                    title: 'Color',
                    name: 'value',
                    type: 'string',
                    options: {
                      list: [
                        {title: 'Red', value: 'red'},
                        {title: 'Blue', value: 'blue'},
                        {title: 'Green', value: 'green'},
                        {title: 'Orange', value: 'orange'},
                        {title: 'Purple', value: 'purple'},
                        {title: 'Gray', value: 'gray'},
                      ],
                    },
                  },
                ],
              },
              // 文字大小
              {
                title: 'Font Size',
                name: 'fontSize',
                type: 'object',
                icon: () => '📏',
                fields: [
                  {
                    title: 'Size',
                    name: 'value',
                    type: 'string',
                    options: {
                      list: [
                        {title: 'Small', value: 'small'},
                        {title: 'Normal', value: 'normal'},
                        {title: 'Large', value: 'large'},
                        {title: 'Extra Large', value: 'xl'},
                      ],
                    },
                  },
                ],
              },
            ],
          },
        },
        {
          type: 'image', // 允许在内容中插入图片
          options: {
            hotspot: true,
          },
          fields: [
            {
              name: 'alt',
              type: 'string',
              title: 'Alternative text',
              description: 'Important for SEO and accessibility.',
            },
            {
              name: 'caption',
              type: 'string',
              title: 'Caption',
            },
          ],
        },
        // 代码块
        {
          type: 'object',
          name: 'codeBlock',
          title: 'Code Block',
          icon: () => '💻',
          fields: [
            {
              name: 'language',
              title: 'Language',
              type: 'string',
              options: {
                list: [
                  {title: 'JavaScript', value: 'javascript'},
                  {title: 'TypeScript', value: 'typescript'},
                  {title: 'Python', value: 'python'},
                  {title: 'Java', value: 'java'},
                  {title: 'C++', value: 'cpp'},
                  {title: 'HTML', value: 'html'},
                  {title: 'CSS', value: 'css'},
                  {title: 'JSON', value: 'json'},
                  {title: 'Bash', value: 'bash'},
                  {title: 'SQL', value: 'sql'},
                  {title: 'Plain Text', value: 'text'},
                ],
              },
            },
            {
              name: 'code',
              title: 'Code',
              type: 'text',
              rows: 10,
            },
            {
              name: 'filename',
              title: 'Filename (optional)',
              type: 'string',
            },
          ],
          preview: {
            select: {
              title: 'filename',
              subtitle: 'language',
              code: 'code',
            },
            prepare({title, subtitle, code}) {
              return {
                title: title || 'Code Block',
                subtitle: subtitle || 'Plain Text',
                media: () => '💻',
              }
            },
          },
        },
        // Block 级别高亮块
        {
          type: 'object',
          name: 'highlightBlock',
          title: 'Highlight Block',
          icon: () => '✨',
          fields: [
            {
              name: 'type',
              title: 'Type',
              type: 'string',
              options: {
                list: [
                  {title: 'Info', value: 'info'},
                  {title: 'Warning', value: 'warning'},
                  {title: 'Error', value: 'error'},
                  {title: 'Success', value: 'success'},
                  {title: 'Note', value: 'note'},
                ],
              },
              initialValue: 'info',
            },
            {
              name: 'title',
              title: 'Title (optional)',
              type: 'string',
            },
            {
              name: 'content',
              title: 'Content',
              type: 'array',
              of: [
                {
                  type: 'block',
                  styles: [{title: 'Normal', value: 'normal'}],
                  marks: {
                    decorators: [
                      {title: 'Strong', value: 'strong'},
                      {title: 'Emphasis', value: 'em'},
                      {title: 'Code', value: 'code'},
                    ],
                  },
                },
              ],
            },
          ],
          preview: {
            select: {
              title: 'title',
              type: 'type',
            },
            prepare({title, type}) {
              const icons: Record<string, string> = {
                info: 'ℹ️',
                warning: '⚠️',
                error: '❌',
                success: '✅',
                note: '📝',
              }
              return {
                title: title || `${type?.toUpperCase()} Block`,
                subtitle: type,
                media: () => icons[type] || '✨',
              }
            },
          },
        },
      ],
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
