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
