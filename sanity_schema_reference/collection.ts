// sanity-studio/schemaTypes/collection.ts

import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'collection',
  title: 'Collection', // 在 Studio 中显示为“合集/系列”
  type: 'document',
  fields: [
    // 为国际化插件预留的字段
    defineField({
      name: 'language',
      type: 'string',
      readOnly: true,
      hidden: true,
    }),
    defineField({
      name: 'name',
      title: 'Collection Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
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
      description: 'Enable this to feature this collection in the homepage hero section.',
      initialValue: false,
    }),
    // 照片关联
    defineField({
      name: 'photos',
      title: 'Photos in this Collection',
      type: 'array',
      of: [{type: 'reference', to: {type: 'photo'}}],
    }),
  ],
})
