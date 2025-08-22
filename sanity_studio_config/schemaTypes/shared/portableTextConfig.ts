// sanity-studio/schemaTypes/shared/portableTextConfig.ts

/**
 * 共享的 Portable Text 配置
 * 用于 log.content 和 author.bio 等富文本字段
 */

// 基础的 block 配置
export const baseBlockConfig = {
  type: 'block' as const,
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
}

// 图片配置
export const imageConfig = {
  type: 'image' as const,
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
}

// 代码块配置
export const codeBlockConfig = {
  type: 'object' as const,
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
    },
    prepare({title, subtitle}: {title?: string; subtitle?: string}) {
      return {
        title: title || 'Code Block',
        subtitle: subtitle || 'Plain Text',
        media: () => '💻',
      }
    },
  },
}

// 高亮块配置
export const highlightBlockConfig = {
  type: 'object' as const,
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
    prepare({title, type}: {title?: string; type?: string}) {
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
        media: () => icons[type || 'info'] || '✨',
      }
    },
  },
}

// 分隔线配置
export const separatorConfig = {
  type: 'object' as const,
  name: 'separator',
  title: 'Separator',
  icon: () => '➖',
  fields: [
    {
      name: 'style',
      title: 'Style',
      type: 'string',
      options: {
        list: [
          {title: 'Default', value: 'default'},
          {title: 'Dashed', value: 'dashed'},
          {title: 'Dotted', value: 'dotted'},
        ],
      },
      initialValue: 'default',
    },
  ],
  preview: {
    prepare() {
      return {
        title: 'Separator',
        subtitle: '---',
      }
    },
  },
}

// 完整的富文本配置（用于 log.content）
export const fullPortableTextConfig = [
  baseBlockConfig,
  imageConfig,
  codeBlockConfig,
  highlightBlockConfig,
  separatorConfig,
]

// 简化的富文本配置（用于 author.bio，不包含代码块和高亮块）
export const simplePortableTextConfig = [
  baseBlockConfig,
  imageConfig,
]

// 基础富文本配置（仅文本，用于更简单的场景）
export const basicPortableTextConfig = [
  {
    ...baseBlockConfig,
    // 简化的样式选项
    styles: [
      {title: 'Normal', value: 'normal'},
      {title: 'H2', value: 'h2'},
      {title: 'H3', value: 'h3'},
      {title: 'Quote', value: 'blockquote'},
    ],
    // 保留基础的 marks 配置
    marks: {
      decorators: [
        {title: 'Strong', value: 'strong'},
        {title: 'Emphasis', value: 'em'},
        {title: 'Code', value: 'code'},
      ],
      annotations: [
        // 仅保留链接
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
      ],
    },
  },
]