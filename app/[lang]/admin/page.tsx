'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Settings,
  TestTube,
  Shield,
  Database,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { 
  runSystemTestsAction, 
  getSpamManagementDataAction, 
  cleanupExpiredDataAction,
  resetSpamSystemAction,
  testSensitiveWordsAction
} from '@/lib/admin-actions'
import {
  getSensitiveWordsText,
  updateSensitiveWordsBatch
} from '@/lib/sensitive-words-actions'

interface SpamStats {
  stats: {
    blockedIPs: number
    activeRateLimits: number
    contentPatterns: number
    config: Record<string, unknown>
  }
  blockedIPs: string[]
  timestamp: string
}

interface TestResults {
  results: Array<{
    name: string
    success: boolean
    message: string
  }>
  summary: {
    total: number
    passed: number
    failed: number
    passRate: string
  }
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [systemTestResults, setSystemTestResults] =
    useState<TestResults | null>(null)
  const [isTestingSystem, setIsTestingSystem] = useState(false)
  const [spamStats, setSpamStats] = useState<SpamStats | null>(null)
  const [isLoadingSpamStats, setIsLoadingSpamStats] = useState(false)
  
  // 敏感词管理状态
  const [sensitiveWordsText, setSensitiveWordsText] = useState('')
  const [isLoadingSensitiveWords, setIsLoadingSensitiveWords] = useState(false)
  const [isSavingSensitiveWords, setIsSavingSensitiveWords] = useState(false)
  const [sensitiveWordsCount, setSensitiveWordsCount] = useState(0)
  
  // 敏感词测试状态
  const [sensitiveTestContent, setSensitiveTestContent] = useState('')
  const [sensitiveTestResult, setSensitiveTestResult] = useState<{
    content: string
    contentLength: number
    hasSensitiveWords: boolean
    foundWords: string[]
    wordsCount: number
  } | null>(null)
  const [isTestingSensitive, setIsTestingSensitive] = useState(false)

  const runSystemTests = async () => {
    setIsTestingSystem(true)
    try {
      const result = await runSystemTestsAction()
      if (result.success && result.data) {
        setSystemTestResults(result.data)
        // 自动跳转到系统测试tab
        setActiveTab('system-test')
      } else {
        alert('系统测试失败')
      }
    } catch {
      alert('系统测试失败')
    } finally {
      setIsTestingSystem(false)
    }
  }

  const loadSpamStats = async () => {
    setIsLoadingSpamStats(true)
    try {
      const result = await getSpamManagementDataAction()
      if (result.success && result.data) {
        setSpamStats(result.data)
        // 自动跳转到恶意攻击管理tab
        setActiveTab('spam-management')
      } else {
        alert('获取恶意攻击统计失败')
      }
    } catch {
      alert('获取恶意攻击统计失败')
    } finally {
      setIsLoadingSpamStats(false)
    }
  }

  const cleanupExpiredData = async () => {
    try {
      const result = await cleanupExpiredDataAction()
      if (result.success) {
        alert(`过期数据清理成功: ${result.message}`)
        loadSpamStats() // 重新加载统计
      } else {
        alert('清理失败')
      }
    } catch {
      alert('清理失败')
    }
  }

  const resetSpamSystem = async () => {
    if (!confirm('确定要完全重置恶意攻击系统吗？这将清除所有历史数据（仅建议在测试环境使用）')) {
      return
    }
    try {
      const result = await resetSpamSystemAction()
      if (result.success) {
        alert(`恶意攻击系统重置成功: ${result.message}`)
        loadSpamStats() // 重新加载统计
      } else {
        alert('重置失败')
      }
    } catch {
      alert('重置失败')
    }
  }

  // 敏感词管理功能
  const loadSensitiveWords = async () => {
    setIsLoadingSensitiveWords(true)
    try {
      const result = await getSensitiveWordsText()
      if (result.success) {
        setSensitiveWordsText(result.data || '')
        setSensitiveWordsCount(result.count || 0)
      } else {
        alert('加载敏感词失败')
      }
    } catch {
      alert('加载敏感词失败')
    } finally {
      setIsLoadingSensitiveWords(false)
    }
  }

  const saveSensitiveWords = async () => {
    setIsSavingSensitiveWords(true)
    try {
      const result = await updateSensitiveWordsBatch(sensitiveWordsText)
      if (result.success) {
        alert(`敏感词保存成功: ${'message' in result ? result.message : '操作完成'}`)
        setSensitiveWordsCount('count' in result ? result.count || 0 : 0)
      } else {
        alert(`保存失败: ${'error' in result ? result.error : '未知错误'}`)
      }
    } catch {
      alert('保存失败')
    } finally {
      setIsSavingSensitiveWords(false)
    }
  }

  // 敏感词测试功能
  const testSensitiveWords = async () => {
    if (!sensitiveTestContent.trim()) {
      alert('请输入要测试的内容')
      return
    }
    
    setIsTestingSensitive(true)
    try {
      const result = await testSensitiveWordsAction(sensitiveTestContent)
      if (result.success && result.data) {
        setSensitiveTestResult(result.data)
      } else {
        alert('敏感词测试失败')
      }
    } catch {
      alert('敏感词测试失败')
    } finally {
      setIsTestingSensitive(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">系统管理面板</h1>
          <p className="text-muted-foreground">管理和监控系统状态</p>
        </div>
        <Badge variant="outline" className="text-body-sm">
          <Settings className="w-4 h-4 mr-1" />
          管理员模式
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="system-test">系统测试</TabsTrigger>
          <TabsTrigger value="spam-management">恶意攻击管理</TabsTrigger>
          <TabsTrigger value="sensitive-words">敏感词管理</TabsTrigger>
          <TabsTrigger value="cache-management">缓存管理</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-body-sm font-medium">系统状态</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">正常</div>
                <p className="text-caption-xs text-muted-foreground">
                  所有服务运行正常
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-body-sm font-medium">
                  数据库连接
                </CardTitle>
                <Database className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">活跃</div>
                <p className="text-caption-xs text-muted-foreground">Prisma 连接正常</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-body-sm font-medium">
                  恶意攻击防护
                </CardTitle>
                <Shield className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">启用</div>
                <p className="text-caption-xs text-muted-foreground">
                  反恶意攻击系统运行中
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-body-sm font-medium">评论系统</CardTitle>
                <MessageSquare className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">正常</div>
                <p className="text-caption-xs text-muted-foreground">
                  评论功能正常运行
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>快速操作</CardTitle>
              <CardDescription>常用的管理操作</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Button onClick={runSystemTests} disabled={isTestingSystem}>
                  <TestTube className="w-4 h-4 mr-2" />
                  {isTestingSystem ? '运行中...' : '运行系统测试'}
                </Button>
                <Button
                  onClick={loadSpamStats}
                  disabled={isLoadingSpamStats}
                  variant="outline"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  {isLoadingSpamStats ? '加载中...' : '检查恶意攻击状态'}
                </Button>
                <Button onClick={cleanupExpiredData} variant="secondary">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  清理过期数据
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system-test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                系统测试
              </CardTitle>
              <CardDescription>
                运行完整的系统测试套件，检查所有核心功能
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={runSystemTests}
                disabled={isTestingSystem}
                className="w-full"
              >
                {isTestingSystem ? '测试运行中...' : '开始系统测试'}
              </Button>

              {systemTestResults && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {systemTestResults.summary.total}
                      </div>
                      <div className="text-body-sm text-muted-foreground">
                        总测试数
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {systemTestResults.summary.passed}
                      </div>
                      <div className="text-body-sm text-muted-foreground">通过</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {systemTestResults.summary.failed}
                      </div>
                      <div className="text-body-sm text-muted-foreground">失败</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {systemTestResults.summary.passRate}
                      </div>
                      <div className="text-body-sm text-muted-foreground">
                        通过率
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {systemTestResults.results.map((result, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {result.success ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          <div>
                            <div className="font-medium">{result.name}</div>
                            <div className="text-body-sm text-muted-foreground">
                              {result.message}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant={result.success ? 'default' : 'destructive'}
                        >
                          {result.success ? '通过' : '失败'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 敏感词测试卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                敏感词检测测试
              </CardTitle>
              <CardDescription>
                测试敏感词检测功能，输入内容查看是否包含敏感词
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-body-sm font-medium">测试内容</div>
                <Textarea
                  value={sensitiveTestContent}
                  onChange={(e) => setSensitiveTestContent(e.target.value)}
                  placeholder="请输入要测试的内容..."
                  className="min-h-[100px]"
                />
              </div>
              
              <Button
                onClick={testSensitiveWords}
                disabled={isTestingSensitive || !sensitiveTestContent.trim()}
                className="w-full"
              >
                {isTestingSensitive ? '检测中...' : '开始敏感词检测'}
              </Button>

              {sensitiveTestResult && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center">
                      <div className="text-body-lg font-bold">
                        {sensitiveTestResult.contentLength}
                      </div>
                      <div className="text-body-sm text-muted-foreground">
                        内容长度
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-body-lg font-bold ${
                        sensitiveTestResult.hasSensitiveWords ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {sensitiveTestResult.hasSensitiveWords ? '是' : '否'}
                      </div>
                      <div className="text-body-sm text-muted-foreground">
                        包含敏感词
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-body-lg font-bold text-orange-600">
                        {sensitiveTestResult.wordsCount}
                      </div>
                      <div className="text-body-sm text-muted-foreground">
                        敏感词数量
                      </div>
                    </div>
                  </div>

                  {sensitiveTestResult.foundWords.length > 0 && (
                    <div>
                      <div className="text-body-sm font-medium mb-2">检测到的敏感词：</div>
                      <div className="flex flex-wrap gap-2">
                        {sensitiveTestResult.foundWords.map((word, index) => (
                          <Badge key={index} variant="destructive">
                            {word}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-caption-xs text-muted-foreground">
                    测试内容：{sensitiveTestResult.content}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="spam-management" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                恶意攻击管理
              </CardTitle>
              <CardDescription>监控和管理反恶意攻击系统</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <Button onClick={loadSpamStats} disabled={isLoadingSpamStats}>
                  {isLoadingSpamStats ? '加载中...' : '刷新统计'}
                </Button>
                <Button onClick={cleanupExpiredData} variant="secondary">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  清理过期数据
                </Button>
                <Link href="/zh/admin/spam-management">
                  <Button variant="outline" className="w-full">
                    <Settings className="w-4 h-4 mr-2" />
                    查看详情
                  </Button>
                </Link>
                <Button onClick={resetSpamSystem} variant="destructive" size="sm">
                  完全重置
                </Button>
              </div>

              {spamStats && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">
                        {spamStats.stats?.activeRateLimits || 0}
                      </div>
                      <div className="text-body-sm text-muted-foreground">
                        活跃限流规则
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {spamStats.stats?.contentPatterns || 0}
                      </div>
                      <div className="text-body-sm text-muted-foreground">
                        内容模式检测
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {spamStats.blockedIPs?.length || 0}
                      </div>
                      <div className="text-body-sm text-muted-foreground">
                        被封IP
                      </div>
                    </div>
                  </div>

                  {spamStats.blockedIPs && spamStats.blockedIPs.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">被封IP列表</h4>
                      <div className="space-y-2">
                        {spamStats.blockedIPs.map(
                          (ip: string, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 border rounded"
                            >
                              <span className="font-mono">{ip}</span>
                              <Button size="sm" variant="outline">
                                解封
                              </Button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sensitive-words" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                敏感词管理
              </CardTitle>
              <CardDescription>
                管理系统敏感词库，用于内容过滤和反垃圾邮件检测
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button 
                    onClick={loadSensitiveWords} 
                    disabled={isLoadingSensitiveWords}
                    variant="outline"
                  >
                    {isLoadingSensitiveWords ? '加载中...' : '加载敏感词'}
                  </Button>
                  <div className="text-body-sm text-muted-foreground">
                    当前敏感词数量: <span className="font-medium">{sensitiveWordsCount}</span>
                  </div>
                </div>
                <Button 
                  onClick={saveSensitiveWords} 
                  disabled={isSavingSensitiveWords || !sensitiveWordsText.trim()}
                >
                  {isSavingSensitiveWords ? '保存中...' : '保存敏感词'}
                </Button>
              </div>

              <div className="space-y-2">
                <div className="text-body-sm font-medium">敏感词列表</div>
                <div className="text-caption-xs text-muted-foreground">
                  • 每个敏感词用英文逗号(,)、中文逗号(，)、换行符或分号分隔
                  <br />
                  • 系统会自动去重和转换为小写
                  <br />
                  • 保存时会替换所有现有敏感词
                </div>
                <Textarea
                  value={sensitiveWordsText}
                  onChange={(e) => setSensitiveWordsText(e.target.value)}
                  placeholder="请输入敏感词，用逗号分隔，例如：垃圾邮件, 广告, 恶意内容..."
                  className="min-h-[200px] font-mono text-body-sm"
                  disabled={isLoadingSensitiveWords}
                />
              </div>

              <div className="text-caption-xs text-muted-foreground bg-muted p-3 rounded">
                   <strong>使用说明：</strong>
                   <br />
                   1. 点击&ldquo;加载敏感词&rdquo;按钮获取当前系统中的敏感词
                   <br />
                   2. 在文本框中编辑敏感词列表，支持多种分隔符
                   <br />
                   3. 点击&ldquo;保存敏感词&rdquo;按钮更新系统敏感词库
                   <br />
                   4. 敏感词会在用户提交评论时自动检测和过滤
                 </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache-management" className="space-y-4">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">缓存管理</h2>
                <p className="text-muted-foreground">统一管理和监控系统缓存</p>
              </div>
              <Badge variant="outline" className="text-body-sm">
                <Database className="w-4 h-4 mr-1" />
                缓存管理
              </Badge>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/zh/admin/cache-management">
                打开专用缓存管理页面
              </Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
