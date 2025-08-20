'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, Play, CheckCircle, XCircle, Image, Folder, FileImage } from 'lucide-react'
import { toast } from 'sonner'

import { getCollectionsForWarmupAction, getCollectionPhotoCountAction, startWarmupTask, getWarmupProgress, getWarmupImageCountAction } from '@/lib/warmup-progress-actions'

type WarmupType = 'cover-images' | 'collection' | 'dev-collections' | 'custom'

type WarmupConfig = {
  type: WarmupType
  limit: number
  sizes: string[]
  formats: string[]
  customImageIds?: string[]
  targetId?: string
}

type Collection = {
  _id: string
  name: {
    zh?: string
    en?: string
  }
  slug: {
    current: string
  }
}

type WarmupProgress = {
  current: number
  total: number
  currentUrl: string
  status: 'processing' | 'success' | 'error'
  message?: string
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
    type: 'cover-images',
    limit: 20,
    sizes: DEFAULT_SIZES,
    formats: ['webp'],
  })
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<WarmupResult | null>(null)
  const [customIds, setCustomIds] = useState('')
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string>('')
  const [targetPhotoCount, setTargetPhotoCount] = useState<number>(0)
  const [progress, setProgress] = useState<WarmupProgress | null>(null)
  const [isLoadingCollections, setIsLoadingCollections] = useState(false)
  const [isLoadingPhotoCount, setIsLoadingPhotoCount] = useState(false)
  const [imageCount, setImageCount] = useState<{ count: number; description: string } | null>(null)
  const [isLoadingImageCount, setIsLoadingImageCount] = useState(false)

  // 加载collections数据
  useEffect(() => {
    if (config.type === 'collection') {
      loadCollections()
    }
  }, [config.type])

  // 当选择collection时，加载photo数量
  useEffect(() => {
    if (config.type === 'collection' && selectedCollection) {
      loadPhotoCount(selectedCollection)
      setConfig(prev => ({ ...prev, targetId: selectedCollection }))
    }
  }, [selectedCollection, config.type])

  // 当预热类型改变时，加载图片数量
  useEffect(() => {
    if (config.type === 'cover-images' || config.type === 'dev-collections') {
      loadImageCount(config.type)
    } else {
      setImageCount(null)
    }
  }, [config.type])

  const loadCollections = async () => {
    setIsLoadingCollections(true)
    try {
      const data = await getCollectionsForWarmupAction()
      setCollections(data)
    } catch (error) {
      toast.error('加载合集列表失败')
      console.error('Failed to load collections:', error)
    } finally {
      setIsLoadingCollections(false)
    }
  }

  const loadPhotoCount = async (collectionId: string) => {
    setIsLoadingPhotoCount(true)
    try {
      const count = await getCollectionPhotoCountAction(collectionId)
      setTargetPhotoCount(count)
    } catch (error) {
      toast.error('加载照片数量失败')
      console.error('Failed to load photo count:', error)
      setTargetPhotoCount(0)
    } finally {
      setIsLoadingPhotoCount(false)
    }
  }

  const loadImageCount = async (type: 'cover-images' | 'dev-collections') => {
    setIsLoadingImageCount(true)
    try {
      const result = await getWarmupImageCountAction(type)
      setImageCount(result)
    } catch (error) {
      toast.error('加载图片数量失败')
      console.error('Failed to load image count:', error)
      setImageCount({ count: 0, description: '获取失败' })
    } finally {
      setIsLoadingImageCount(false)
    }
  }

  const handleWarmup = () => {
    setResult(null)
    setProgress(null)

    startTransition(async () => {
      try {
        const payload = {
          ...config,
          customImageIds: config.type === 'custom' ? customIds.split('\n').filter(id => id.trim()) : undefined,
          targetId: config.type === 'collection' ? selectedCollection : undefined,
        }

        // 启动预热任务
        const { taskId } = await startWarmupTask(payload)

        // 轮询获取进度
        const pollProgress = async () => {
          try {
            const progressData = await getWarmupProgress(taskId)
            setProgress(progressData)

            if (progressData.completed) {
              // 任务完成，更新进度为100%
              setProgress({
                ...progressData,
                current: progressData.total,
                status: progressData.result?.success ? 'success' : 'error'
              })
              
              if (progressData.result) {
                setResult(progressData.result)
                if (progressData.result.success) {
                  toast.success(`预热完成：成功预热 ${progressData.result.successCount}/${progressData.result.totalUrls} 个图片，耗时 ${(progressData.result.duration / 1000).toFixed(1)}s`)
                } else {
                  toast.warning(`预热部分失败：${progressData.result.successCount}/${progressData.result.totalUrls} 个图片预热成功`)
                }
              }
              return // 停止轮询
            }

            // 继续轮询
            setTimeout(pollProgress, 1000)
          } catch (error) {
            console.error('轮询进度失败:', error)
            toast.error(`获取进度失败：${error instanceof Error ? error.message : '未知错误'}`)
          }
        }

        // 开始轮询
        setTimeout(pollProgress, 1000)

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
            onValueChange={(value: WarmupType) => {
              setConfig(prev => ({ ...prev, type: value }))
              setSelectedCollection('')
              setTargetPhotoCount(0)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择预热类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cover-images">
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  <span>Cover Image</span>
                </div>
              </SelectItem>
              <SelectItem value="collection">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  <span>Collection</span>
                </div>
              </SelectItem>
              <SelectItem value="dev-collections">
                <div className="flex items-center gap-2">
                  <FileImage className="h-4 w-4" />
                  <span>Develop Collection</span>
                </div>
              </SelectItem>
              <SelectItem value="custom">
                <div className="flex items-center gap-2">
                  <FileImage className="h-4 w-4" />
                  <span>自定义图片ID</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 预热对象选择 */}
        {config.type === 'collection' && (
          <div>
            <Label htmlFor="collection-select">预热对象</Label>
            <div className="flex items-center gap-2">
              <Select
                value={selectedCollection}
                onValueChange={setSelectedCollection}
                disabled={isLoadingCollections}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={isLoadingCollections ? "加载中..." : "选择合集"} />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((collection) => (
                    <SelectItem key={collection._id} value={collection._id}>
                      {collection.name?.zh || collection.name?.en || collection.slug.current}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isLoadingPhotoCount ? (
                <Badge variant="secondary">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  加载中
                </Badge>
              ) : targetPhotoCount > 0 ? (
                <Badge variant="outline">
                  {targetPhotoCount} 张照片
                </Badge>
              ) : null}
            </div>
          </div>
        )}

        {/* 显示预热目标数量 */}
        {config.type === 'cover-images' && (
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              将预热所有合集的封面图片
            </div>
            {isLoadingImageCount ? (
              <Badge variant="secondary">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                加载中
              </Badge>
            ) : imageCount ? (
              <Badge variant="outline">
                {imageCount.count} 张图片
              </Badge>
            ) : null}
          </div>
        )}
        
        {config.type === 'dev-collections' && (
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              将预热所有开发合集的文章主图
            </div>
            {isLoadingImageCount ? (
              <Badge variant="secondary">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                加载中
              </Badge>
            ) : imageCount ? (
              <Badge variant="outline">
                {imageCount.count} 张图片
              </Badge>
            ) : null}
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

      {/* 预计URL数量显示 */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">预计URL数量:</span>
          <Badge variant="secondary" className="font-mono">
            {(() => {
              let imgCount = 0
              
              if (config.type === 'cover-images' || config.type === 'dev-collections') {
                imgCount = imageCount ? imageCount.count : 0
              } else if (config.type === 'collection') {
                imgCount = Math.min(targetPhotoCount, config.limit)
              } else if (config.type === 'custom') {
                imgCount = customIds.split('\n').filter(id => id.trim()).length
              }
              
              const totalUrls = imgCount * config.sizes.length * config.formats.length
              return totalUrls.toLocaleString()
            })()} URLs
          </Badge>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {(() => {
            let imgCount = 0
            let description = ''
            
            if (config.type === 'cover-images') {
              imgCount = imageCount ? imageCount.count : 0
              description = `${imgCount} 张封面图片`
            } else if (config.type === 'dev-collections') {
              imgCount = imageCount ? imageCount.count : 0
              description = `${imgCount} 张主图`
            } else if (config.type === 'collection') {
              imgCount = targetPhotoCount
              description = `${imgCount} 张照片`
            } else if (config.type === 'custom') {
              imgCount = customIds.split('\n').filter(id => id.trim()).length
              description = `${imgCount} 张自定义图片`
            }
            
            return `${description} × ${config.sizes.length} 尺寸 × ${config.formats.length} 格式`
          })()} 
        </div>
      </div>

      <Button
        onClick={handleWarmup}
        disabled={isPending || (config.type === 'custom' && !customIds.trim()) || (config.type === 'collection' && !selectedCollection) || config.sizes.length === 0 || config.formats.length === 0}
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

      {/* 进度反馈 */}
      {progress && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>预热进度</span>
                <span>{progress.current}/{progress.total}</span>
              </div>
              <Progress value={(progress.current / progress.total) * 100} className="w-full" />
              <div className="text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    {progress.status === 'processing' && <Loader2 className="h-3 w-3 animate-spin" />}
                    {progress.status === 'success' && <CheckCircle className="h-3 w-3 text-green-500" />}
                    {progress.status === 'error' && <XCircle className="h-3 w-3 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* 改善文件名显示：提取文件名部分并优化换行 */}
                    <div className="space-y-1">
                      <div className="font-mono text-xs leading-relaxed break-all">
                        {(() => {
                          const url = progress.currentUrl
                          // 提取文件名部分（最后一个/后的内容）
                          const fileName = url.split('/').pop() || url
                          // 如果URL太长，显示...省略号
                          if (url.length > 80) {
                            const start = url.substring(0, 30)
                            const end = fileName.length > 30 ? '...' + fileName.substring(fileName.length - 30) : fileName
                            return (
                              <>
                                <span className="text-muted-foreground">{start}...</span>
                                <br />
                                <span className="font-medium">{end}</span>
                              </>
                            )
                          }
                          return url
                        })()} 
                      </div>
                      
                      {/* 显示状态和用时信息 */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          progress.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                          progress.status === 'success' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {progress.status === 'processing' ? '处理中' :
                           progress.status === 'success' ? '成功' : '失败'}
                        </span>
                        
                        {/* 显示用时信息 */}
                        {progress.message && progress.status === 'success' && (
                          <span className="text-green-600 font-mono">
                            {progress.message}
                          </span>
                        )}
                        
                        {/* 显示错误信息 */}
                        {progress.message && progress.status === 'error' && (
                          <span className="text-red-600 font-mono">
                            {progress.message}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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