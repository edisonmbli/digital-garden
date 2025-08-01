// sanity-studio/schemaTypes/collection.ts

import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'collection',
  title: 'Collection', // 在 Studio 中显示为"合集/系列"
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Collection Name',
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
      options: {
        hotspot: true,
      },
    }),
    // 精选开关
    defineField({
      name: 'isFeatured',
      title: 'Featured on Homepage',
      type: 'boolean',
      description:
        'Enable this to feature this collection in the homepage hero section.',
      initialValue: false,
    }),
    // 照片关联
    defineField({
      name: 'photos',
      title: 'Photos in this Collection',
      type: 'array',
      of: [{ type: 'reference', to: { type: 'photo' } }],
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
      const { name_zh, name_en, oldName, media, isFeatured } = selection
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
