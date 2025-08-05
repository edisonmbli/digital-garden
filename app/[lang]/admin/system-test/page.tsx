'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  testDatabaseConnectionAction,
  testAllFieldsAction,
  testGetCommentsAction,
  debugPrismaAction,
  testSpamDetectionAction,
  resetSpamSystemAction,
  getSystemStatsAction,
  testExtendedDALAction
} from '@/lib/admin-actions'

interface ServerActionResult {
  success: boolean
  message?: string
  error?: string
  data?: unknown
}

interface TestResult {
  name: string
  success: boolean
  message: string
  timestamp: string
  details?: string
}

export default function SystemTestPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(false)

  if (!isLoaded) {
    return <div>加载中...</div>
  }

  if (!isSignedIn) {
    return <div>请先登录以访问系统测试功能</div>
  }

  const runServerAction = async (testName: string, action: () => Promise<ServerActionResult>) => {
    setLoading(true)
    try {
      const data = await action()
      
      const result: TestResult = {
        name: testName,
        success: data.success,
        message: data.message || (data.success ? '测试通过' : '测试失败'),
        timestamp: new Date().toLocaleString(),
        details: JSON.stringify(data, null, 2)
      }
      
      setTestResults(prev => [result, ...prev])
    } catch (error) {
      const result: TestResult = {
        name: testName,
        success: false,
        message: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toLocaleString()
      }
      setTestResults(prev => [result, ...prev])
    } finally {
      setLoading(false)
    }
  }

  const runSpamTest = async (content: string, testName: string) => {
    setLoading(true)
    try {
      const data = await testSpamDetectionAction(content)
      
      const result: TestResult = {
        name: testName,
        success: data.success,
        message: data.success 
          ? `检测结果: ${data.data?.isSpam ? '垃圾内容' : '正常内容'} (置信度: ${data.data?.confidence})`
          : data.error || '检测失败',
        timestamp: new Date().toLocaleString(),
        details: JSON.stringify(data, null, 2)
      }
      
      setTestResults(prev => [result, ...prev])
    } catch (error) {
      const result: TestResult = {
        name: testName,
        success: false,
        message: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toLocaleString()
      }
      setTestResults(prev => [result, ...prev])
    } finally {
      setLoading(false)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">系统测试面板</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 测试控制面板 */}
        <div className="space-y-6">
          {/* 数据库测试 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-display-sm font-semibold mb-4">数据库测试</h2>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => runServerAction('数据库连接测试', testDatabaseConnectionAction)}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
              >
                测试数据库连接
              </button>
              <button
                onClick={() => runServerAction('基础字段测试', testAllFieldsAction)}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
              >
                测试基础字段
              </button>
              <button
                onClick={() => runServerAction('获取评论列表测试', testGetCommentsAction)}
                disabled={loading}
                className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
              >
                测试获取评论列表
              </button>
              <button
                onClick={() => runServerAction('Prisma调试信息', debugPrismaAction)}
                disabled={loading}
                className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
              >
                获取Prisma调试信息
              </button>
              <button
                onClick={() => runServerAction('扩展DAL功能测试', testExtendedDALAction)}
                disabled={loading}
                className="bg-teal-500 hover:bg-teal-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
              >
                测试扩展DAL功能
              </button>
            </div>
          </div>

          {/* 垃圾邮件检测测试 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-display-sm font-semibold mb-4">垃圾邮件检测测试</h2>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => runSpamTest('这是正常内容', '正常内容测试')}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
              >
                测试正常内容
              </button>
              <button
                onClick={() => runSpamTest('免费赚钱点击这里', '敏感词测试')}
                disabled={loading}
                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
              >
                测试敏感词检测
              </button>
              <button
                onClick={() => runSpamTest('aaaaaaaaaaaa', '重复字符测试')}
                disabled={loading}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
              >
                测试重复字符
              </button>
              <button
                onClick={() => runSpamTest('THIS IS ALL UPPERCASE CONTENT THAT SHOULD BE BLOCKED', '全大写测试')}
                disabled={loading}
                className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
              >
                测试全大写内容
              </button>
            </div>
          </div>

          {/* 系统管理 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-display-sm font-semibold mb-4">系统管理</h2>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => runServerAction('重置垃圾邮件系统', resetSpamSystemAction)}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded"
              >
                重置垃圾邮件系统
              </button>
              <button
                onClick={() => runServerAction('获取系统统计信息', getSystemStatsAction)}
                disabled={loading}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded"
              >
                获取系统统计信息
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={clearResults}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              清除结果
            </button>
          </div>
        </div>

        {/* 测试结果面板 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-display-sm font-semibold mb-4">测试结果</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500">暂无测试结果</p>
            ) : (
              testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border-l-4 ${
                    result.success
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium">{result.name}</h3>
                    <span className="text-caption-xs text-gray-500">{result.timestamp}</span>
                  </div>
                  <p className="text-body-sm mt-1">{result.message}</p>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-caption-xs cursor-pointer text-gray-600">详细信息</summary>
                      <pre className="text-caption-xs mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded overflow-x-auto">
                        {result.details}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}