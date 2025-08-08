// app/api/sanity-data/route.ts
// 临时 API 路由，用于在网络连接问题时间接访问 Sanity 数据
// 仅在直接访问 Sanity API 失败时使用

import { NextRequest, NextResponse } from 'next/server'
import { client } from '../../../sanity/client'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  try {
    switch (type) {
      case 'count':
        const [collections, photos] = await Promise.all([
          client.fetch(`count(*[_type == "collection"])`),
          client.fetch(`count(*[_type == "photo"])`)
        ])
        return NextResponse.json({ collections, photos })

      case 'collections':
        const collectionsData = await client.fetch(`
          *[_type == "collection"] {
            _id,
            _i18n_id_,
            language,
            name,
            slug,
            description,
            "coverImageUrl": coverImage.asset->url,
            isFeatured
          }
        `)
        return NextResponse.json({ data: collectionsData })

      case 'photos':
        const photosData = await client.fetch(`
          *[_type == "photo"] {
            _id,
            "assetId": image.asset._ref,
            title,
            description
          }
        `)
        return NextResponse.json({ data: photosData })

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    logger.error('API', 'Sanity API Error', error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch data from Sanity' },
      { status: 500 }
    )
  }
}