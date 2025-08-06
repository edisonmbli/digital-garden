// lib/sensitive-words-actions.ts
'use server'

import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
import { logger } from '@/lib/logger'
import { isAdmin } from '@/lib/admin-actions'

/**
 * 验证当前用户是否为管理员
 * 复用admin-actions.ts中已验证的权限检查逻辑
 */
async function verifyAdmin(): Promise<string> {
  const startTime = Date.now()
  
  logger.debug('SensitiveWords', '开始验证管理员权限')
  
  try {
    const { userId } = await auth()
    
    logger.debug('SensitiveWords', '用户认证结果', {
      hasUserId: !!userId
    })
    
    if (!userId) {
      logger.warn('SensitiveWords', '权限验证失败: 用户未登录')
      throw new Error('未登录')
    }

    // 使用admin-actions.ts中已验证的权限检查逻辑
    const adminCheck = await isAdmin()
    
    logger.debug('SensitiveWords', '权限检查结果', {
      isAdmin: adminCheck
    })
    
    if (!adminCheck) {
      logger.warn('SensitiveWords', '权限验证失败: 用户不是管理员')
      throw new Error('权限不足：需要管理员权限')
    }

    logger.debug('SensitiveWords', '管理员权限验证成功')
    return userId
    
  } catch (error) {
    logger.performance('SensitiveWords', '权限验证', Date.now() - startTime, {
      success: false
    })
    throw error
  } finally {
    logger.performance('SensitiveWords', '权限验证', Date.now() - startTime, {
      success: true
    })
  }
}

// 获取所有敏感词
export async function getSensitiveWords() {
  const start = Date.now()
  logger.debug('SensitiveWords', '开始获取所有敏感词')
  
  try {
    const userId = await verifyAdmin()
    
    logger.debug('SensitiveWords', '从数据库查询敏感词')
    const words = await prisma.sensitiveWord.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    logger.info('SensitiveWords', '查询敏感词完成', { count: words.length }, undefined, userId)
    logger.performance('SensitiveWords', 'getSensitiveWords', Date.now() - start)
    
    return { success: true, data: words }
  } catch (error) {
    logger.error('SensitiveWords', '获取敏感词时发生错误', error as Error)
      return {
        success: false,
        error: '获取敏感词失败'
      }
    }
}

// 添加敏感词
export async function addSensitiveWord(word: string) {
  const start = Date.now()
  logger.debug('SensitiveWords', '开始添加敏感词', { hasWord: !!word })
  
  try {
    const userId = await verifyAdmin()
    
    if (!word || word.trim().length === 0) {
      logger.warn('SensitiveWords', '添加失败: 敏感词为空', undefined, undefined, userId)
      return { success: false, error: '敏感词不能为空' }
    }
    
    const trimmedWord = word.trim().toLowerCase()
    logger.debug('SensitiveWords', '处理敏感词', { wordLength: trimmedWord.length })
    
    // 检查是否已存在
    logger.debug('SensitiveWords', '检查敏感词是否已存在')
    const existing = await prisma.sensitiveWord.findUnique({
      where: { word: trimmedWord }
    })
    
    if (existing) {
      logger.warn('SensitiveWords', '添加失败: 敏感词已存在', { existingId: existing.id }, undefined, userId)
      return { success: false, error: '该敏感词已存在' }
    }
    
    logger.debug('SensitiveWords', '开始创建新敏感词')
    const newWord = await prisma.sensitiveWord.create({
      data: { word: trimmedWord }
    })
    
    logger.audit('SensitiveWords', '添加敏感词', userId, { wordId: newWord.id })
    
    revalidateTag('sensitive-words')
    logger.debug('SensitiveWords', '缓存已刷新')
    logger.performance('SensitiveWords', 'addSensitiveWord', Date.now() - start)
    
    return { success: true, data: newWord }
  } catch (error) {
    logger.error('SensitiveWords', '添加敏感词时发生错误', error as Error)
    return { 
      success: false, 
      error: '添加敏感词失败' 
    }
  }
}

// 删除敏感词
export async function deleteSensitiveWord(id: string) {
  const start = Date.now()
  logger.debug('SensitiveWords', '开始删除敏感词', { wordId: id })
  
  try {
    const userId = await verifyAdmin()
    
    logger.debug('SensitiveWords', '执行删除操作')
    await prisma.sensitiveWord.delete({
      where: { id }
    })
    
    logger.audit('SensitiveWords', '删除敏感词', userId, { wordId: id })
    
    revalidateTag('sensitive-words')
    logger.debug('SensitiveWords', '删除成功，缓存已刷新')
    logger.performance('SensitiveWords', 'deleteSensitiveWord', Date.now() - start)
    
    return { success: true }
  } catch (error) {
    logger.error('SensitiveWords', '删除敏感词时发生错误', error as Error, { wordId: id })
    return { 
      success: false, 
      error: '删除敏感词失败' 
    }
  }
}

// 批量添加敏感词
export async function addSensitiveWordsBatch(words: string[]) {
  try {
    await verifyAdmin()
    
    if (!words || words.length === 0) {
      return { success: false, error: '敏感词列表不能为空' }
    }
    
    const trimmedWords = words
      .map(word => word.trim().toLowerCase())
      .filter(word => word.length > 0)
    
    if (trimmedWords.length === 0) {
      return { success: false, error: '没有有效的敏感词' }
    }
    
    // 检查已存在的词
    const existingWords = await prisma.sensitiveWord.findMany({
      where: {
        word: { in: trimmedWords }
      },
      select: { word: true }
    })
    
    const existingWordSet = new Set(existingWords.map((w: { word: string }) => w.word))
    const newWords = trimmedWords.filter(word => !existingWordSet.has(word))
    
    if (newWords.length === 0) {
      return { success: false, error: '所有敏感词都已存在' }
    }
    
    // 批量创建
    const result = await prisma.sensitiveWord.createMany({
      data: newWords.map(word => ({ word })),
      skipDuplicates: true
    })
    
    revalidateTag('sensitive-words')
    
    return { 
      success: true, 
      data: { 
        created: result.count,
        skipped: trimmedWords.length - result.count 
      }
    }
  } catch {
    return { 
      success: false, 
      error: '批量添加敏感词失败' 
    }
  }
}

// 批量更新敏感词（替换所有现有敏感词）
export async function updateSensitiveWordsBatch(wordsText: string) {
  const start = Date.now()
  logger.debug('SensitiveWords', '开始批量更新敏感词', { 
    textLength: wordsText?.length || 0,
    hasText: !!wordsText 
  })
  
  try {
    const userId = await verifyAdmin()
    
    // 解析输入的文本，支持逗号、换行符、分号分隔
    const words = wordsText
      .split(/[,，\n\r;；]/)
      .map(word => word.trim().toLowerCase())
      .filter(word => word.length > 0)
      .filter((word, index, arr) => arr.indexOf(word) === index) // 去重
    
    logger.debug('SensitiveWords', '文本解析结果', { 
      totalWords: words.length,
      sampleCount: Math.min(words.length, 5) // 只记录数量，不记录具体内容
    })
    
    if (words.length === 0) {
      logger.warn('SensitiveWords', '批量更新失败: 没有有效的敏感词', undefined, undefined, userId)
      return { success: false, error: '没有有效的敏感词' }
    }
    
    logger.debug('SensitiveWords', '开始数据库事务操作')
    let deletedCount = 0
    let createdCount = 0
    
    // 使用事务：先删除所有现有敏感词，再添加新的
    await prisma.$transaction(async (tx) => {
      logger.debug('SensitiveWords', '删除所有现有敏感词')
      const deleteResult = await tx.sensitiveWord.deleteMany({})
      deletedCount = deleteResult.count
      logger.debug('SensitiveWords', '删除完成', { deletedCount })
      
      logger.debug('SensitiveWords', '批量添加新敏感词')
      // 批量添加新敏感词
      const createResult = await tx.sensitiveWord.createMany({
        data: words.map(word => ({ word })),
        skipDuplicates: true
      })
      createdCount = createResult.count
      logger.debug('SensitiveWords', '添加完成', { createdCount })
    })
    
    logger.audit('SensitiveWords', '批量更新敏感词', userId, { 
      deletedCount, 
      createdCount, 
      totalWords: words.length 
    })
    
    revalidateTag('sensitive-words')
    logger.debug('SensitiveWords', '事务执行成功，缓存已刷新')
    logger.performance('SensitiveWords', 'updateSensitiveWordsBatch', Date.now() - start)
    
    const result = { 
      success: true, 
      message: `成功更新 ${words.length} 个敏感词`,
      count: words.length
    }
    logger.info('SensitiveWords', '批量更新完成', { count: words.length }, undefined, userId)
    
    return result
  } catch (error) {
    logger.error('SensitiveWords', '批量更新敏感词时发生错误', error as Error)
    return { 
      success: false, 
      error: '批量更新敏感词失败' 
    }
  }
}

// 获取敏感词的纯文本格式（用于编辑）
export async function getSensitiveWordsText() {
  try {
    await verifyAdmin()
    
    const words = await prisma.sensitiveWord.findMany({
      select: { word: true },
      orderBy: { word: 'asc' }
    })
    
    const wordsText = words.map(item => item.word).join(', ')
    
    return { success: true, data: wordsText, count: words.length }
  } catch {
    return { 
      success: false, 
      error: '获取敏感词文本失败' 
    }
  }
}

// 检查文本是否包含敏感词
export async function checkSensitiveWords(text: string) {
  try {
    if (!text || text.trim().length === 0) {
      return { success: true, hasSensitiveWords: false, words: [] }
    }
    
    const allSensitiveWords = await prisma.sensitiveWord.findMany({
      select: { word: true }
    })
    
    const lowerText = text.toLowerCase()
    const foundWords = allSensitiveWords
      .filter((item: { word: string }) => lowerText.includes(item.word))
      .map((item: { word: string }) => item.word)
    
    return {
      success: true,
      hasSensitiveWords: foundWords.length > 0,
      words: foundWords
    }
  } catch {
    return {
      success: false,
      error: '检查敏感词失败',
      hasSensitiveWords: false,
      words: []
    }
  }
}