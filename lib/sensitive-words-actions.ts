// lib/sensitive-words-actions.ts
'use server'

import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'
import { revalidateTag } from 'next/cache'

// 验证管理员权限
async function verifyAdmin() {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('未授权访问')
  }
  // 这里可以添加更严格的管理员权限检查
  // 例如检查用户角色或特定权限
  return userId
}

// 获取所有敏感词
export async function getSensitiveWords() {
  try {
    await verifyAdmin()
    
    const words = await prisma.sensitiveWord.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return { success: true, data: words }
  } catch {
      return {
        success: false,
        error: '获取敏感词失败'
      }
    }
}

// 添加敏感词
export async function addSensitiveWord(word: string) {
  try {
    await verifyAdmin()
    
    if (!word || word.trim().length === 0) {
      return { success: false, error: '敏感词不能为空' }
    }
    
    const trimmedWord = word.trim().toLowerCase()
    
    // 检查是否已存在
    const existing = await prisma.sensitiveWord.findUnique({
      where: { word: trimmedWord }
    })
    
    if (existing) {
      return { success: false, error: '该敏感词已存在' }
    }
    
    const newWord = await prisma.sensitiveWord.create({
      data: { word: trimmedWord }
    })
    
    revalidateTag('sensitive-words')
    
    return { success: true, data: newWord }
  } catch {
    return { 
      success: false, 
      error: '添加敏感词失败' 
    }
  }
}

// 删除敏感词
export async function deleteSensitiveWord(id: string) {
  try {
    await verifyAdmin()
    
    await prisma.sensitiveWord.delete({
      where: { id }
    })
    
    revalidateTag('sensitive-words')
    
    return { success: true }
  } catch {
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
  try {
    await verifyAdmin()
    
    // 解析输入的文本，支持逗号、换行符、分号分隔
    const words = wordsText
      .split(/[,，\n\r;；]/)
      .map(word => word.trim().toLowerCase())
      .filter(word => word.length > 0)
      .filter((word, index, arr) => arr.indexOf(word) === index) // 去重
    
    if (words.length === 0) {
      return { success: false, error: '没有有效的敏感词' }
    }
    
    // 使用事务：先删除所有现有敏感词，再添加新的
    await prisma.$transaction(async (tx) => {
      // 删除所有现有敏感词
      await tx.sensitiveWord.deleteMany({})
      
      // 批量添加新敏感词
      await tx.sensitiveWord.createMany({
        data: words.map(word => ({ word })),
        skipDuplicates: true
      })
    })
    
    revalidateTag('sensitive-words')
    
    return { 
      success: true, 
      message: `成功更新 ${words.length} 个敏感词`,
      count: words.length
    }
  } catch {
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