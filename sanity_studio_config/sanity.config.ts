// sanity.config.ts

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { table } from '@sanity/table'
import { schemaTypes } from './schemaTypes'
import { orderableDocumentListDeskItem } from '@sanity/orderable-document-list'
import { documentInternationalization } from '@sanity/document-internationalization'
// import {PortableTextEditor} from '@sanity/portable-text-editor' // 移除，因为不是正确的插件配置方式

// 根据环境变量动态设置 dataset
// 重要：在浏览器环境中，只有以 SANITY_STUDIO_ 开头的环境变量可见
// 因此只有 SANITY_STUDIO_DATASET 能在 Studio 中生效
const dataset = process.env.SANITY_STUDIO_DATASET || 'development'

export default defineConfig({
  name: 'default',
  title: `🌱 Digital Garden Sanity - DATASET: ${dataset.toUpperCase()} 🌱`,

  projectId: 'rmgc6o8r',
  // 根据环境变量动态设置 dataset，默认为 'development'
  // 在部署时，可以通过设置 SANITY_DATASET 环境变量为 'production' 来切换到生产环境
  dataset,

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
    table(),
    // 文档级国际化
    documentInternationalization({
      supportedLanguages: [
        { id: 'en', title: 'English' },
        { id: 'zh', title: 'Chinese' },
      ],
      schemaTypes: ['log'],
    }),
    // PortableTextEditor 配置已移除，因为 enableJsonPaste 功能不存在
  ],

  schema: {
    types: schemaTypes,
  },
})
