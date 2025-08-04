// sanity-studio/schemaTypes/collection.ts

import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'devCollection',
  title: 'Develop Collection', // 在 Studio 中显示为"合集/系列"
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Develop Collection Name',
      type: 'object',
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
      fields: [
        {
          name: 'en',
          title: 'English',
          type: 'text',
          rows: 2,
        },
        {
          name: 'zh',
          title: '中文',
          type: 'text',
          rows: 2,
        },
      ],
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    // 照片关联
    defineField({
      name: 'logs',
      title: 'Logs in this Collection',
      type: 'array',
      of: [{type: 'reference', to: {type: 'log'}}],
    }),
  ],
  preview: {
    select: {
      name_zh: 'name.zh',
      name_en: 'name.en',
      media: 'coverImage',
    },
    prepare(selection) {
      const {name_zh, name_en, media} = selection
      // 兼容新旧格式
      const displayName = name_zh || name_en || 'Untitled Develop Collection'
      const subtitle = name_en && name_zh ? `${name_en}` : ''

      return {
        title: displayName,
        subtitle,
        media,
      }
    },
  },
})
