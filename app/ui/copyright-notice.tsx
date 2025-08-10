// app/ui/copyright-notice.tsx

interface CopyrightData {
  title?: string
  content?: string
  minimal?: string
}

interface CopyrightNoticeProps {
  contentType: 'photo' | 'tutorial'
  variant?: 'default' | 'minimal'
  className?: string
  copyrightData?: CopyrightData
}

export function CopyrightNotice({
  variant = 'default',
  className = '',
  copyrightData,
}: CopyrightNoticeProps) {
  // 从环境变量获取版权文本，如果未设置则使用默认值
  const defaultCopyrightText =
    process.env.NEXT_PUBLIC_COPYRIGHT_TEXT ||
    '© Digital Garden AI - 未经授权禁止转载'

  if (!copyrightData) {
    // 如果没有传入版权数据，显示环境变量或默认文本
    return (
      <div className={`text-center text-muted-foreground ${className}`}>
        <p className={variant === 'minimal' ? 'text-body-xs' : 'text-body-sm'}>
          {defaultCopyrightText}
        </p>
      </div>
    )
  }

  if (variant === 'minimal') {
    return (
      <div className={`text-center text-muted-foreground ${className}`}>
        <p className="text-body-xs">
          {copyrightData.minimal ||
            copyrightData.content ||
            defaultCopyrightText}
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-muted/90 rounded-lg p-4 text-center ${className}`}>
      <h3 className="text-body-xs font-medium text-foreground mb-2">
        {copyrightData.title || '版权声明'}
      </h3>
      <p className="text-body-xs text-muted-foreground leading-relaxed">
        {copyrightData.content || defaultCopyrightText}
      </p>
    </div>
  )
}
