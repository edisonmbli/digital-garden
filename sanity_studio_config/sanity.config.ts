// sanity.config.ts

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemaTypes'
import { orderableDocumentListDeskItem } from '@sanity/orderable-document-list'
import { documentInternationalization } from '@sanity/document-internationalization'

export default defineConfig({
  name: 'default',
  title: 'digital-garden-sanity',

  projectId: 'rmgc6o8r',
  dataset: 'development',

  plugins: [
    structureTool({
      structure: (S, context) =>
        S.list()
          .title('Content')
          .items([
            // 可拖拽排序的 Collections
            orderableDocumentListDeskItem({
              type: 'collection',
              title: 'Collections',
              S,
              context,
              filter: '_type == "collection"',
            }),

            // 可拖拽排序的 Dev Collections
            orderableDocumentListDeskItem({
              type: 'devCollection',
              title: 'Dev Collections',
              S,
              context,
              filter: '_type == "devCollection"',
            }),

            S.divider(),

            // 添加其他默认文档类型
            ...S.documentTypeListItems().filter((listItem) => {
              const id = listItem.getId()
              return id && !['collection', 'devCollection'].includes(id)
            }),
          ]),
    }),
    visionTool(),
    // 文档级国际化
    documentInternationalization({
      supportedLanguages: [
        { id: 'en', title: 'English' },
        { id: 'zh', title: 'Chinese' },
      ],
      schemaTypes: ['log'],
    }),
  ],

  schema: {
    types: schemaTypes,
  },
})
