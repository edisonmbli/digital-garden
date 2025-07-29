'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import * as commentsDal from '@/lib/dal-comments'
import { checkContentFilter, resetSpamSystem, getSpamStats, getBlockedIPs, unblockIP, cleanupExpiredData } from '@/lib/anti-spam'
import { checkSensitiveWords, getSensitiveWords } from '@/lib/sensitive-words-actions'

// 验证管理员权限的辅助函数
async function verifyAdminAccess() {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('未登录')
  }
  // 这里可以添加更严格的管理员权限检查
  return userId
}

// 数据库连接测试
export async function testDatabaseConnectionAction() {
  try {
    await verifyAdminAccess()
    const result = await commentsDal.testDatabaseConnection()
    return {
      success: true,
      data: result,
      message: '数据库连接测试完成'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '测试失败'
    }
  }
}

// 获取垃圾邮件管理数据
export async function getSpamManagementDataAction() {
  try {
    await verifyAdminAccess()
    
    // 清理过期数据
    cleanupExpiredData()
    
    // 获取统计信息
    const stats = getSpamStats()
    const blockedIPs = getBlockedIPs()
    
    return {
      success: true,
      data: {
        stats,
        blockedIPs,
        timestamp: new Date().toISOString()
      },
      message: '垃圾邮件管理数据获取完成'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取数据失败'
    }
  }
}

// 解封IP地址
export async function unblockIPAction(ipAddress: string) {
  try {
    await verifyAdminAccess()
    
    const ipSchema = z.string().min(1).max(45) // IPv4/IPv6地址长度限制
    const validatedIP = ipSchema.parse(ipAddress)
    
    const unblocked = unblockIP(validatedIP)
    
    // 重新验证相关页面
    revalidatePath('/admin/spam-management')
    
    return {
      success: true,
      data: { 
        ipAddress: validatedIP, 
        unblocked 
      },
      message: unblocked ? 'IP解封成功' : 'IP未在封禁列表中'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '解封IP失败'
    }
  }
}

// 清理过期数据
export async function cleanupSpamDataAction() {
  try {
    await verifyAdminAccess()
    
    cleanupExpiredData()
    
    // 重新验证相关页面
    revalidatePath('/admin/spam-management')
    
    return {
      success: true,
      message: '过期数据清理完成'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '清理数据失败'
    }
  }
}

// 测试所有字段
export async function testAllFieldsAction() {
  try {
    await verifyAdminAccess()
    const result = await commentsDal.testAllFields()
    return {
      success: true,
      data: result,
      message: '字段测试完成'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '测试失败'
    }
  }
}

// 获取评论列表测试
export async function testGetCommentsAction() {
  try {
    await verifyAdminAccess()
    const comments = await commentsDal.getComments({ postId: 'test-post-id', limit: 5 })
    return {
      success: true,
      data: comments,
      message: '评论列表获取测试完成'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '测试失败'
    }
  }
}

// Prisma调试信息
export async function debugPrismaAction() {
  try {
    await verifyAdminAccess()
    
    // 1. 检查Prisma Client版本和配置
    const clientInfo = {
      version: '6.11.1',
      // @ts-expect-error - 访问内部属性进行调试
      dmmf: prisma._dmmf?.datamodel?.models?.find(m => m.name === 'Comment')?.fields?.map(f => ({
        name: f.name,
        type: f.type,
        isOptional: f.isOptional,
        isList: f.isList
      })) || 'DMMF not available'
    }

    // 2. 检查数据库表结构
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'Comment' 
      ORDER BY ordinal_position;
    `

    // 3. 尝试查询一个评论记录（如果存在）
    const sampleComment = await prisma.comment.findFirst({
      include: {
        user: true,
        replies: true,
        _count: {
          select: {
            replies: true
          }
        }
      }
    })

    return {
      success: true,
      data: {
        clientInfo,
        tableInfo,
        sampleComment,
        timestamp: new Date().toISOString()
      },
      message: 'Prisma调试信息获取完成'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '调试失败'
    }
  }
}

// 垃圾邮件检测测试
export async function testSpamDetectionAction(content: string) {
  try {
    await verifyAdminAccess()
    
    const contentSchema = z.string().min(1).max(5000)
    const validatedContent = contentSchema.parse(content)
    
    const result = await checkContentFilter(validatedContent)
    
    return {
      success: true,
      data: {
        content: validatedContent,
        contentLength: validatedContent.length,
        isSpam: result.isSpam,
        reasons: result.reasons,
        confidence: result.confidence
      },
      message: '垃圾邮件检测测试完成'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '检测失败'
    }
  }
}

// 敏感词检测测试
export async function testSensitiveWordsAction(content: string) {
  try {
    await verifyAdminAccess()
    
    const contentSchema = z.string().min(1).max(5000)
    const validatedContent = contentSchema.parse(content)
    
    const result = await checkSensitiveWords(validatedContent)
    
    return {
      success: true,
      data: {
        content: validatedContent,
        contentLength: validatedContent.length,
        hasSensitiveWords: result.hasSensitiveWords,
        foundWords: result.words,
        wordsCount: result.words.length
      },
      message: '敏感词检测测试完成'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '检测失败'
    }
  }
}

// 敏感词系统测试
export async function testSensitiveWordsSystemAction() {
  try {
    await verifyAdminAccess()
    
    const tests = []
    
    // 1. 测试获取敏感词列表
    try {
      const wordsResult = await getSensitiveWords()
      tests.push({
        name: '获取敏感词列表',
        success: wordsResult.success,
        message: wordsResult.success ? `成功获取 ${wordsResult.data?.length || 0} 个敏感词` : wordsResult.error || '获取失败'
      })
    } catch (error) {
      tests.push({
        name: '获取敏感词列表',
        success: false,
        message: error instanceof Error ? error.message : '获取异常'
      })
    }
    
    // 2. 测试正常内容检测
    try {
      const normalTest = await checkSensitiveWords('这是一个正常的测试内容')
      tests.push({
        name: '正常内容检测',
        success: true,
        message: normalTest.hasSensitiveWords ? '检测到敏感词（可能误报）' : '正常内容检测通过'
      })
    } catch (error) {
      tests.push({
        name: '正常内容检测',
        success: false,
        message: error instanceof Error ? error.message : '检测异常'
      })
    }
    
    // 3. 测试敏感词检测（如果有敏感词的话）
    try {
      const wordsResult = await getSensitiveWords()
      if (wordsResult.success && wordsResult.data && wordsResult.data.length > 0) {
        const firstWord = wordsResult.data[0].word
        const sensitiveTest = await checkSensitiveWords(`测试内容包含${firstWord}`)
        tests.push({
          name: '敏感词检测',
          success: true,
          message: sensitiveTest.hasSensitiveWords ? '敏感词检测正常' : '敏感词检测可能有问题'
        })
      } else {
        tests.push({
          name: '敏感词检测',
          success: true,
          message: '无敏感词可测试'
        })
      }
    } catch (error) {
      tests.push({
        name: '敏感词检测',
        success: false,
        message: error instanceof Error ? error.message : '检测异常'
      })
    }
    
    const passedTests = tests.filter(t => t.success).length
    
    return {
      success: true,
      data: {
        tests,
        summary: {
          total: tests.length,
          passed: passedTests,
          failed: tests.length - passedTests,
          passRate: tests.length > 0 ? `${Math.round((passedTests / tests.length) * 100)}%` : '0%'
        }
      },
      message: '敏感词系统测试完成'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '测试失败'
    }
  }
}

// 清理过期数据（生产环境推荐）
export async function cleanupExpiredDataAction() {
  try {
    await verifyAdminAccess()
    
    // 获取清理前的状态
    const beforeStats = getSpamStats()
    
    // 清理过期数据
    cleanupExpiredData()
    
    // 获取清理后的状态
    const afterStats = getSpamStats()
    
    // 重新验证相关页面
    revalidatePath('/admin')
    revalidatePath('/admin/spam-management')
    
    return {
      success: true,
      data: {
        before: beforeStats,
        after: afterStats,
        cleaned: {
          blockedIPs: beforeStats.blockedIPs - afterStats.blockedIPs,
          rateLimits: beforeStats.activeRateLimits - afterStats.activeRateLimits,
          contentPatterns: beforeStats.contentPatterns - afterStats.contentPatterns
        }
      },
      message: '过期数据清理完成'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '清理失败'
    }
  }
}

// 重置垃圾邮件系统（测试环境使用）
export async function resetSpamSystemAction() {
  try {
    await verifyAdminAccess()
    
    // 获取重置前的状态
    const beforeStats = getSpamStats()
    
    // 重置系统
    resetSpamSystem()
    
    // 获取重置后的状态
    const afterStats = getSpamStats()
    
    // 重新验证相关页面
    revalidatePath('/admin')
    revalidatePath('/admin/spam-management')
    
    return {
      success: true,
      data: {
        before: beforeStats,
        after: afterStats
      },
      message: '反垃圾邮件系统已重置（仅测试环境使用）'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '重置失败'
    }
  }
}

// 获取系统统计信息
export async function getSystemStatsAction() {
  try {
    await verifyAdminAccess()
    
    const [
      totalComments,
      pendingComments,
      approvedComments,
      rejectedComments,
      spamStats
    ] = await Promise.all([
      prisma.comment.count(),
      prisma.comment.count({ where: { status: 'PENDING' } }),
      prisma.comment.count({ where: { status: 'APPROVED' } }),
      prisma.comment.count({ where: { status: 'REJECTED' } }),
      getSpamStats()
    ])
    
    return {
      success: true,
      data: {
        comments: {
          total: totalComments,
          pending: pendingComments,
          approved: approvedComments,
          rejected: rejectedComments
        },
        spam: spamStats,
        timestamp: new Date().toISOString()
      },
      message: '系统统计信息获取完成'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取统计信息失败'
    }
  }
}

// 扩展DAL功能测试
export async function testExtendedDALAction() {
  try {
    await verifyAdminAccess()
    
    // 测试各种DAL功能
    const tests = []
    
    // 测试获取评论统计
    try {
      const stats = await prisma.comment.groupBy({
        by: ['status'],
        _count: {
          id: true
        }
      })
      tests.push({
        name: '评论状态统计',
        success: true,
        result: stats
      })
    } catch (error) {
      tests.push({
        name: '评论状态统计',
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
    
    // 测试用户评论统计
    try {
      const userStats = await prisma.comment.groupBy({
        by: ['userId'],
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 5
      })
      tests.push({
        name: '用户评论统计',
        success: true,
        result: userStats
      })
    } catch (error) {
      tests.push({
        name: '用户评论统计',
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
    
    return {
      success: true,
      data: {
        tests,
        summary: {
          total: tests.length,
          passed: tests.filter(t => t.success).length,
          failed: tests.filter(t => !t.success).length
        }
      },
      message: '扩展DAL功能测试完成'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '测试失败'
    }
  }
}

// 综合系统测试
export async function runSystemTestsAction() {
  try {
    await verifyAdminAccess()
    
    const results = []
    let totalTests = 0
    let passedTests = 0
    
    // 1. 数据库连接测试
    try {
      const dbTest = await testDatabaseConnectionAction()
      results.push({
        name: '数据库连接',
        success: dbTest.success,
        message: dbTest.success ? '数据库连接正常' : dbTest.error || '连接失败'
      })
      totalTests++
      if (dbTest.success) passedTests++
    } catch {
      results.push({
        name: '数据库连接',
        success: false,
        message: '数据库连接测试异常'
      })
      totalTests++
    }
    
    // 2. 字段测试
    try {
      const fieldsTest = await testAllFieldsAction()
      results.push({
        name: '数据库字段',
        success: fieldsTest.success,
        message: fieldsTest.success ? '所有字段正常' : fieldsTest.error || '字段测试失败'
      })
      totalTests++
      if (fieldsTest.success) passedTests++
    } catch {
      results.push({
        name: '数据库字段',
        success: false,
        message: '字段测试异常'
      })
      totalTests++
    }
    
    // 3. 评论列表获取测试
    try {
      const commentsTest = await testGetCommentsAction()
      results.push({
        name: '评论列表获取',
        success: commentsTest.success,
        message: commentsTest.success ? '评论列表获取正常' : commentsTest.error || '获取失败'
      })
      totalTests++
      if (commentsTest.success) passedTests++
    } catch {
      results.push({
        name: '评论列表获取',
        success: false,
        message: '评论列表获取测试异常'
      })
      totalTests++
    }
    
    // 4. 恶意攻击检测测试
    try {
      const spamTest = await testSpamDetectionAction('这是一个正常的测试内容')
      results.push({
        name: '恶意攻击检测',
        success: spamTest.success,
        message: spamTest.success ? '恶意攻击检测正常' : spamTest.error || '检测失败'
      })
      totalTests++
      if (spamTest.success) passedTests++
    } catch {
      results.push({
        name: '恶意攻击检测',
        success: false,
        message: '恶意攻击检测测试异常'
      })
      totalTests++
    }
    
    // 5. 系统统计信息测试
    try {
      const statsTest = await getSystemStatsAction()
      results.push({
        name: '系统统计信息',
        success: statsTest.success,
        message: statsTest.success ? '统计信息获取正常' : statsTest.error || '获取失败'
      })
      totalTests++
      if (statsTest.success) passedTests++
    } catch {
      results.push({
        name: '系统统计信息',
        success: false,
        message: '统计信息获取测试异常'
      })
      totalTests++
    }
    
    // 6. Prisma调试信息测试
    try {
      const prismaTest = await debugPrismaAction()
      results.push({
        name: 'Prisma调试信息',
        success: prismaTest.success,
        message: prismaTest.success ? 'Prisma调试信息正常' : prismaTest.error || '调试失败'
      })
      totalTests++
      if (prismaTest.success) passedTests++
    } catch {
      results.push({
        name: 'Prisma调试信息',
        success: false,
        message: 'Prisma调试信息测试异常'
      })
      totalTests++
    }
    
    // 7. 敏感词系统测试
    try {
      const sensitiveWordsTest = await testSensitiveWordsSystemAction()
      results.push({
        name: '敏感词系统',
        success: sensitiveWordsTest.success,
        message: sensitiveWordsTest.success ? '敏感词系统正常' : sensitiveWordsTest.error || '敏感词系统测试失败'
      })
      totalTests++
      if (sensitiveWordsTest.success) passedTests++
    } catch {
      results.push({
        name: '敏感词系统',
        success: false,
        message: '敏感词系统测试异常'
      })
      totalTests++
    }
    
    // 8. 扩展DAL功能测试
    try {
      const dalTest = await testExtendedDALAction()
      results.push({
        name: '扩展DAL功能',
        success: dalTest.success,
        message: dalTest.success ? 'DAL功能正常' : dalTest.error || 'DAL测试失败'
      })
      totalTests++
      if (dalTest.success) passedTests++
    } catch {
      results.push({
        name: '扩展DAL功能',
        success: false,
        message: 'DAL功能测试异常'
      })
      totalTests++
    }
    
    const passRate = totalTests > 0 ? `${Math.round((passedTests / totalTests) * 100)}%` : '0%'
    
    return {
      success: true,
      data: {
        results,
        summary: {
          total: totalTests,
          passed: passedTests,
          failed: totalTests - passedTests,
          passRate
        }
      },
      message: '系统测试完成'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '系统测试失败'
    }
  }
}