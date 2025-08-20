'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Play, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { executeWarmup } from '@/lib/admin-warmup-actions'

type WarmupType = 'collection-covers' | 'featured-photos' | 'dev-collections' | 'custom'

type WarmupConfig = {
  type: WarmupType
  limit: number
  sizes: string[]
  formats: string[]
  customImageIds?: string[]
}

type WarmupResult = {
  success: boolean
  totalUrls: number
  successCount: number
  failureCount: number
  duration: number
  errors?: string[]
}

const DEFAULT_SIZES = ['400', '800', '1200', '1600']
const EXTENDED_SIZES = ['200', '400', '600', '800', '1000', '1200', '1400', '1600', '1920', '2400']
const FORMATS = ['webp', 'jpg']

export function WarmupControlPanel() {
  const [config, setConfig] = useState<WarmupConfig>({
    type: 'collection-covers',
    limit: 20,
    sizes: DEFAULT_SIZES,
    formats: ['webp'],
  })
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<WarmupResult | null>(null)
  const [customIds, setCustomIds] = useState('')

  const handleWarmup = () => {
    setResult(null)

    startTransition(async () => {
      try {
        const payload = {
          ...config,
          customImageIds: config.type === 'custom' ? customIds.split('\n').filter(id => id.trim()) : undefined,
        }

        const data = await executeWarmup(payload)
        setResult(data)

        if (data.success) {
          toast.success(`预热完成：成功预热 ${data.successCount}/${data.totalUrls} 个图片，耗时 ${data.duration}ms`)
        } else {
          toast.warning(`预热部分失败：${data.successCount}/${data.totalUrls} 个图片预热成功`)
        }
      } catch (error) {
        toast.error(`预热失败：${error instanceof Error ? error.message : '未知错误'}`)
      }
    })
  }

  const handleSizeToggle = (size: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      sizes: checked
        ? [...prev.sizes, size]
        : prev.sizes.filter(s => s !== size)
    }))
  }

  const handleFormatToggle = (format: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      formats: checked
        ? [...prev.formats, format]
        : prev.formats.filter(f => f !== format)
    }))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="warmup-type">预热类型</Label>
          <Select
            value={config.type}
            onValueChange={(value: WarmupType) => setConfig(prev => ({ ...prev, type: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择预热类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="collection-covers">合集封面</SelectItem>
              <SelectItem value="featured-photos">热门照片</SelectItem>
              <SelectItem value="dev-collections">开发合集</SelectItem>
              <SelectItem value="custom">自定义图片ID</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {config.type !== 'custom' && (
          <div>
            <Label htmlFor="limit">数量限制</Label>
            <Input
              id="limit"
              type="number"
              min="1"
              max="100"
              value={config.limit}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig(prev => ({ ...prev, limit: parseInt(e.target.value) || 1 }))}
            />
          </div>
        )}

        {config.type === 'custom' && (
          <div>
            <Label htmlFor="custom-ids">图片ID列表（每行一个）</Label>
            <Textarea
              id="custom-ids"
              placeholder="请输入图片ID，每行一个\n例如：\nimage1\nimage2\nimage3"
              value={customIds}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomIds(e.target.value)}
              rows={6}
            />
          </div>
        )}

        <div>
          <Label>图片尺寸</Label>
          <div className="grid grid-cols-5 gap-2 mt-2">
            {EXTENDED_SIZES.map(size => (
              <div key={size} className="flex items-center space-x-2">
                <Checkbox
                  id={`size-${size}`}
                  checked={config.sizes.includes(size)}
                  onCheckedChange={(checked: boolean) => handleSizeToggle(size, checked)}
                />
                <Label htmlFor={`size-${size}`} className="text-sm">{size}px</Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>图片格式</Label>
          <div className="flex gap-4 mt-2">
            {FORMATS.map(format => (
              <div key={format} className="flex items-center space-x-2">
                <Checkbox
                  id={`format-${format}`}
                  checked={config.formats.includes(format)}
                  onCheckedChange={(checked: boolean) => handleFormatToggle(format, checked)}
                />
                <Label htmlFor={`format-${format}`} className="text-sm">{format.toUpperCase()}</Label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Button
        onClick={handleWarmup}
        disabled={isPending || config.sizes.length === 0 || config.formats.length === 0}
        className="w-full"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            预热中...
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            开始预热
          </>
        )}
      </Button>

      {result && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">
                  {result.success ? '预热完成' : '预热部分失败'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">总URL数:</span>
                  <Badge variant="outline" className="ml-2">{result.totalUrls}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">成功数:</span>
                  <Badge variant="outline" className="ml-2 text-green-600">{result.successCount}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">失败数:</span>
                  <Badge variant="outline" className="ml-2 text-red-600">{result.failureCount}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">耗时:</span>
                  <Badge variant="outline" className="ml-2">{result.duration}ms</Badge>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-red-600">错误信息:</Label>
                  <div className="mt-1 text-xs text-muted-foreground space-y-1">
                    {result.errors.slice(0, 5).map((error, index) => (
                      <div key={index} className="truncate">{error}</div>
                    ))}
                    {result.errors.length > 5 && (
                      <div>... 还有 {result.errors.length - 5} 个错误</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}