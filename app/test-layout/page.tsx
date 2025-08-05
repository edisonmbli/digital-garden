import { LogDetailPage } from '@/app/ui/log-detail-page'
import { type Locale } from '@/i18n-config'

// 模拟数据
const mockEnrichedLogPost = {
  _id: 'test-log-1',
  title: '测试文章：三栏布局展示',
  content: [
    {
      _type: 'block',
      children: [
        {
          _type: 'span',
          text: '这是一个测试文章，用于展示新的三栏布局效果。'
        }
      ]
    },
    {
      _type: 'block',
      children: [
        {
          _type: 'span',
          text: '左侧显示导航和合集中的其他文章，中间是主要内容，右侧是文章目录。'
        }
      ]
    }
  ],
  publishedAt: '2024-01-15T10:00:00Z',
  author: {
    name: '测试作者',
    avatarUrl: undefined
  },
  slug: {
    current: 'test-layout-article'
  },
  post: {
    id: '1',
    likesCount: 5,
    commentsCount: 3,
    isLikedByUser: false,
    hasUserCommented: false
  },
  collection: {
    _id: 'test-collection-1',
    name: '测试合集',
    slug: 'test-collection',
    logs: [
      {
        _id: 'test-log-2',
        title: '第一篇文章',
        slug: 'first-article',
        publishedAt: '2024-01-10T10:00:00Z',
        excerpt: '这是第一篇文章的摘要',
        language: 'zh' as Locale
      },
      {
        _id: 'test-log-3',
        title: '第二篇文章',
        slug: 'second-article',
        publishedAt: '2024-01-12T10:00:00Z',
        excerpt: '这是第二篇文章的摘要',
        language: 'zh' as Locale
      },
      {
        _id: 'test-log-4',
        title: '第三篇文章',
        slug: 'third-article',
        publishedAt: '2024-01-14T10:00:00Z',
        excerpt: '这是第三篇文章的摘要',
        language: 'zh' as Locale
      }
    ]
  }
}

const mockDictionary = {
  develop: {
    title: '开发日志',
    publishedOn: '发布于',
    by: '作者',
    otherArticles: '本合集的其他文章'
  },
  common: {
    tableOfContents: '目录'
  }
}

export default function TestLayoutPage() {
  return (
    <LogDetailPage
      enrichedLogPost={mockEnrichedLogPost}
      lang="zh"
      dictionary={mockDictionary}
      translationMap={{}}
    />
  )
}