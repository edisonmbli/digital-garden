// lib/anti-spam.ts
import prisma from './prisma'

// ================================================= //
//                   类型定义                        //
// ================================================= //

interface SpamCheckResult {
  isSpam: boolean
  reason?: string
  confidence?: number
  blockedUntil?: number
}

interface IPRateLimit {
  count: number
  resetTime: number
  violations: number
  blockedUntil?: number
}

interface ContentRecord {
  timestamp: number
  userId?: string
  ipAddress?: string
}

// ================================================= //
//                   内存存储                        //
// ================================================= //

// IP频率限制记录
const ipRateLimits = new Map<string, IPRateLimit>()

// 被封禁的IP列表
const blockedIPs = new Set<string>()

// 内容历史记录（用于检测重复内容）
const contentHistory = new Map<string, ContentRecord[]>()

// ================================================= //
//                   配置参数                        //
// ================================================= //

const SPAM_CONFIG = {
  // 频率限制
  MAX_COMMENTS_PER_MINUTE: 5,
  MAX_VIOLATIONS_BEFORE_BLOCK: 3,
  IP_BLOCK_DURATION: 15 * 60 * 1000, // 15分钟
  
  // 内容过滤
  MAX_CONTENT_LENGTH: 1000,
  MIN_CONTENT_LENGTH: 1,
  CONFIDENCE_THRESHOLD: 0.7,
  
  // 重复内容检测
  DUPLICATE_CONTENT_THRESHOLD: 3,
  DUPLICATE_TIME_WINDOW: 5 * 60 * 1000, // 5分钟
}

// ================================================= //
//                   工具函数                        //
// ================================================= //

function getClientIP(): string {
  // 在实际应用中，从请求头获取真实IP
  // 这里返回一个模拟IP用于演示
  // 为了测试目的，生成随机IP避免频率限制
  if (process.env.NODE_ENV === 'development') {
    const randomIP = `192.168.1.${Math.floor(Math.random() * 254) + 1}`
    return randomIP
  }
  return '127.0.0.1'
}

function hashContent(content: string): string {
  // 简单的内容哈希，生产环境建议使用更强的哈希算法
  return Buffer.from(content.toLowerCase().trim()).toString('base64')
}

export async function containsSensitiveWords(content: string): Promise<boolean> {
  const lowerContent = content.toLowerCase()
  
  try {
    // 从数据库获取敏感词
    const sensitiveWords = await prisma.sensitiveWord.findMany({
      select: { word: true }
    })
    
    const foundWords = sensitiveWords.filter((wordRecord: { word: string }) => 
      lowerContent.includes(wordRecord.word.toLowerCase())
    )
    
    return foundWords.length > 0
  } catch {
    // 如果数据库查询失败，返回false以免影响正常功能
    return false
  }
}

function hasRepeatedCharacters(content: string): boolean {
  // 检测是否有过多重复字符（如：aaaaaa, !!!!!!, 哈哈哈哈哈哈）
  const repeatedPattern = /(.)\1{4,}/g // 同一字符连续出现5次或以上
  return repeatedPattern.test(content)
}

function hasExcessiveCapitals(content: string): boolean {
  // 检测是否有过多大写字母（可能是在"喊叫"）
  const capitalLetters = content.match(/[A-Z]/g) || []
  const totalLetters = content.match(/[A-Za-z]/g) || []
  
  if (totalLetters.length < 5) {
    return false // 内容太短，不检测
  }
  
  const capitalRatio = capitalLetters.length / totalLetters.length
  return capitalRatio > 0.5 // 超过50%是大写字母就认为是异常
}

/**
 * 清理过期的IP封禁
 */
function cleanupExpiredBlocks(): void {
  const now = Date.now()
  
  for (const [ip, limit] of ipRateLimits.entries()) {
    if (limit.blockedUntil && now > limit.blockedUntil) {
      blockedIPs.delete(ip)
      // 重置违规次数，但保留其他信息
      limit.violations = 0
      delete limit.blockedUntil
      ipRateLimits.set(ip, limit)
    }
  }
}

// ================================================= //
//                   核心防护函数                    //
// ================================================= //

/**
 * 1. 频率限制检查
 */
export async function checkIPRateLimit(ipAddress: string): Promise<SpamCheckResult> {
  const now = Date.now()
  
  // 先清理过期的封禁
  cleanupExpiredBlocks()
  
  // 检查IP是否被封禁
  if (blockedIPs.has(ipAddress)) {
    const ipLimit = ipRateLimits.get(ipAddress)
    const blockedUntil = ipLimit?.blockedUntil || (now + SPAM_CONFIG.IP_BLOCK_DURATION)
    
    return {
      isSpam: true,
      reason: 'IP地址已被封禁',
      confidence: 1.0,
      blockedUntil
    }
  }
  
  let ipLimit = ipRateLimits.get(ipAddress)
  
  // 初始化或重置过期的限制记录
  if (!ipLimit || now > ipLimit.resetTime) {
    ipLimit = {
      count: 0,
      resetTime: now + 60000, // 1分钟窗口
      violations: ipLimit?.violations || 0
    }
  }
  
  // 检查是否超过频率限制
  if (ipLimit.count >= SPAM_CONFIG.MAX_COMMENTS_PER_MINUTE) {
    ipLimit.violations++
    
    // 如果违规次数过多，封禁IP
    if (ipLimit.violations >= SPAM_CONFIG.MAX_VIOLATIONS_BEFORE_BLOCK) {
      blockedIPs.add(ipAddress)
      ipLimit.blockedUntil = now + SPAM_CONFIG.IP_BLOCK_DURATION
    }
    
    ipRateLimits.set(ipAddress, ipLimit)
    
    return {
      isSpam: true,
      reason: `评论过于频繁，每分钟最多${SPAM_CONFIG.MAX_COMMENTS_PER_MINUTE}条评论`,
      confidence: 0.9,
      blockedUntil: ipLimit.blockedUntil
    }
  }
  
  // 增加计数
  ipLimit.count++
  ipRateLimits.set(ipAddress, ipLimit)
  
  return {
    isSpam: false,
    confidence: 0.0
  }
}

/**
 * 2. 内容过滤检查
 */
export async function checkContentFilter(content: string): Promise<{ isSpam: boolean; confidence: number; reasons: string[] }> {
  const reasons: string[] = []
  let totalConfidence = 0
  
  // 长度检查
  if (content.length > SPAM_CONFIG.MAX_CONTENT_LENGTH) {
    return {
      isSpam: true,
      confidence: 1.0,
      reasons: [`评论内容过长，最多${SPAM_CONFIG.MAX_CONTENT_LENGTH}字符`]
    }
  }
  
  if (content.trim().length < SPAM_CONFIG.MIN_CONTENT_LENGTH) {
    return {
      isSpam: true,
      confidence: 1.0,
      reasons: ['评论内容不能为空']
    }
  }
  
  // 检查敏感词
  if (await containsSensitiveWords(content)) {
    reasons.push('包含敏感词')
    totalConfidence += 0.8
  }
  
  // 检查重复字符
  if (hasRepeatedCharacters(content)) {
    reasons.push('包含过多重复字符')
    totalConfidence += 0.4
  }
  
  // 检查全大写
  if (hasExcessiveCapitals(content)) {
    reasons.push('全部大写字母')
    totalConfidence += 0.3
  }
  
  // 链接检测（简单版本）
  const urlPattern = /(https?:\/\/[^\s]+)/gi
  const urls = content.match(urlPattern) || []
  if (urls.length > 2) {
    totalConfidence += 0.4
    reasons.push('包含过多链接')
  }
  
  const isSpam = totalConfidence >= SPAM_CONFIG.CONFIDENCE_THRESHOLD
  
  return {
    isSpam,
    confidence: Math.min(totalConfidence, 1.0),
    reasons
  }
}

/**
 * 3. 行为分析检查
 */
export async function checkBehaviorPattern(
  content: string, 
  userId?: string, 
  ipAddress?: string
): Promise<SpamCheckResult> {
  const contentHash = hashContent(content)
  const now = Date.now()
  
  // 获取历史记录
  let history = contentHistory.get(contentHash) || []
  
  // 清理过期记录
  history = history.filter(record => 
    now - record.timestamp < SPAM_CONFIG.DUPLICATE_TIME_WINDOW
  )
  
  // 检查重复内容
  const duplicateCount = history.length
  
  if (duplicateCount >= SPAM_CONFIG.DUPLICATE_CONTENT_THRESHOLD) {
    return {
      isSpam: true,
      reason: '检测到重复内容提交',
      confidence: 0.9
    }
  }
  
  // 记录当前提交
  history.push({
    timestamp: now,
    userId,
    ipAddress
  })
  
  contentHistory.set(contentHash, history)
  
  // 检查同一用户或IP的快速连续提交
  if (userId || ipAddress) {
    const recentSubmissions = history.filter(record => 
      (userId && record.userId === userId) || 
      (ipAddress && record.ipAddress === ipAddress)
    )
    
    if (recentSubmissions.length >= 3) {
      const timeSpan = now - recentSubmissions[0].timestamp
      if (timeSpan < 60000) { // 1分钟内3次提交
        return {
          isSpam: true,
          reason: '提交频率异常',
          confidence: 0.8
        }
      }
    }
  }
  
  return {
    isSpam: false,
    confidence: duplicateCount * 0.2 // 重复次数越多，可疑度越高
  }
}

/**
 * 4. 综合垃圾邮件检查
 */
export async function checkSpam(data: {
  content: string
  userId?: string
  ipAddress?: string
}): Promise<SpamCheckResult> {
  const { content, userId, ipAddress } = data
  
  // 获取IP地址（如果没有提供）
  const clientIP = ipAddress || getClientIP()
  
  // 1. IP频率限制检查
  const rateLimitResult = await checkIPRateLimit(clientIP)
  if (rateLimitResult.isSpam) {
    return rateLimitResult
  }
  
  // 2. 内容过滤检查
  const contentResult = await checkContentFilter(content)
  if (contentResult.isSpam) {
    // 记录IP违规行为
    const ipLimit = ipRateLimits.get(clientIP)
    if (ipLimit) {
      ipLimit.violations = (ipLimit.violations || 0) + 1
      ipRateLimits.set(clientIP, ipLimit)
    }
    return {
      isSpam: true,
      reason: contentResult.reasons.join('、'),
      confidence: contentResult.confidence
    }
  }
  
  // 3. 行为分析检查
  const behaviorResult = await checkBehaviorPattern(content, userId, clientIP)
  if (behaviorResult.isSpam) {
    return behaviorResult
  }
  
  return {
    isSpam: false,
    confidence: 0.0
  }
}

// ================================================= //
//                   管理功能                        //
// ================================================= //

/**
 * 解除IP封禁
 */
export function unblockIP(ipAddress: string): boolean {
  const removed = blockedIPs.delete(ipAddress)
  ipRateLimits.delete(ipAddress)
  return removed
}

/**
 * 获取被封禁的IP列表
 */
export function getBlockedIPs(): string[] {
  return Array.from(blockedIPs)
}

/**
 * 清理过期数据
 */
export function cleanupExpiredData(): void {
  const now = Date.now()
  
  // 清理过期的IP限制记录
  for (const [ip, limit] of ipRateLimits.entries()) {
    if (limit.blockedUntil && now > limit.blockedUntil) {
      blockedIPs.delete(ip)
      ipRateLimits.delete(ip)
    } else if (now > limit.resetTime && limit.count === 0) {
      ipRateLimits.delete(ip)
    }
  }
  
  // 清理过期的内容历史记录
  for (const [hash, history] of contentHistory.entries()) {
    const validHistory = history.filter(record => 
      now - record.timestamp < SPAM_CONFIG.DUPLICATE_TIME_WINDOW
    )
    
    if (validHistory.length === 0) {
      contentHistory.delete(hash)
    } else if (validHistory.length !== history.length) {
      contentHistory.set(hash, validHistory)
    }
  }
}

/**
 * 获取反垃圾邮件统计信息
 */
export function getSpamStats() {
  return {
    blockedIPs: blockedIPs.size,
    activeRateLimits: ipRateLimits.size,
    contentPatterns: contentHistory.size,
    config: SPAM_CONFIG
  }
}

/**
 * 重置反垃圾邮件系统状态（主要用于测试）
 */
export function resetSpamSystem(): void {
  blockedIPs.clear()
  ipRateLimits.clear()
  contentHistory.clear()
}