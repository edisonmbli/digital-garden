// lib/env-validation.ts
/**
 * 环境变量验证工具
 * 确保所有必需的环境变量都已正确设置
 */

interface EnvConfig {
  name: string
  required: boolean
  description: string
  sensitive?: boolean
}

const ENV_CONFIGS: EnvConfig[] = [
  // 数据库
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL 数据库连接字符串',
    sensitive: true,
  },
  
  // Clerk 认证
  {
    name: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    required: true,
    description: 'Clerk 公开密钥',
  },
  {
    name: 'CLERK_SECRET_KEY',
    required: true,
    description: 'Clerk 私密密钥',
    sensitive: true,
  },
  {
    name: 'CLERK_WEBHOOK_SECRET',
    required: true,
    description: 'Clerk Webhook 验证密钥',
    sensitive: true,
  },
  
  // Sanity CMS
  {
    name: 'NEXT_PUBLIC_SANITY_PROJECT_ID',
    required: true,
    description: 'Sanity 项目 ID',
  },
  {
    name: 'NEXT_PUBLIC_SANITY_DATASET',
    required: true,
    description: 'Sanity 数据集名称',
  },
  {
    name: 'NEXT_PUBLIC_SANITY_API_VERSION',
    required: true,
    description: 'Sanity API 版本',
  },
  {
    name: 'SANITY_WEBHOOK_SECRET',
    required: true,
    description: 'Sanity Webhook 验证密钥',
    sensitive: true,
  },
  
  // 应用配置
  {
    name: 'AUTHOR_USER_ID',
    required: false,
    description: '作者用户 ID（用于自动回复）',
  },
  {
    name: 'WEBHOOK_RATE_LIMIT_PER_HOUR',
    required: false,
    description: 'Webhook 每小时速率限制',
  },
  {
    name: 'NODE_ENV',
    required: true,
    description: '运行环境',
  },
]

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  summary: {
    total: number
    required: number
    missing: number
    present: number
  }
}

/**
 * 验证环境变量
 */
export function validateEnvironmentVariables(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let missingCount = 0
  let presentCount = 0
  const requiredCount = ENV_CONFIGS.filter(config => config.required).length

  for (const config of ENV_CONFIGS) {
    const value = process.env[config.name]
    
    if (!value || value.trim() === '') {
      if (config.required) {
        errors.push(`❌ 缺少必需的环境变量: ${config.name} - ${config.description}`)
        missingCount++
      } else {
        warnings.push(`⚠️  可选环境变量未设置: ${config.name} - ${config.description}`)
      }
    } else {
      presentCount++
      
      // 验证敏感信息是否可能被意外暴露
      if (config.sensitive && !config.name.startsWith('NEXT_PUBLIC_')) {
        // 检查是否在客户端代码中使用了敏感环境变量
        if (typeof window !== 'undefined') {
          warnings.push(`⚠️  敏感环境变量 ${config.name} 可能在客户端被访问`)
        }
      }
      
      // 验证特定格式
      if (config.name === 'DATABASE_URL' && !value.startsWith('postgresql://')) {
        errors.push(`❌ DATABASE_URL 格式不正确，应以 'postgresql://' 开头`)
      }
      
      if (config.name === 'NODE_ENV' && !['development', 'production', 'test'].includes(value)) {
        warnings.push(`⚠️  NODE_ENV 值不标准: ${value}`)
      }
    }
  }

  const isValid = errors.length === 0

  return {
    isValid,
    errors,
    warnings,
    summary: {
      total: ENV_CONFIGS.length,
      required: requiredCount,
      missing: missingCount,
      present: presentCount,
    },
  }
}

/**
 * 在开发环境中打印验证结果
 */
export function printValidationResult(result: ValidationResult): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('\n🔍 环境变量验证结果:')
    console.log(`总计: ${result.summary.total} | 必需: ${result.summary.required} | 已设置: ${result.summary.present} | 缺失: ${result.summary.missing}`)
    
    if (result.errors.length > 0) {
      console.log('\n❌ 错误:')
      result.errors.forEach(error => console.log(error))
    }
    
    if (result.warnings.length > 0) {
      console.log('\n⚠️  警告:')
      result.warnings.forEach(warning => console.log(warning))
    }
    
    if (result.isValid) {
      console.log('\n✅ 所有必需的环境变量都已正确设置')
    } else {
      console.log('\n❌ 环境变量配置不完整，请检查上述错误')
    }
    console.log('')
  }
}

/**
 * 获取安全的环境变量值（用于日志记录）
 */
export function getSafeEnvValue(name: string): string {
  const config = ENV_CONFIGS.find(c => c.name === name)
  const value = process.env[name]
  
  if (!value) {
    return '<未设置>'
  }
  
  if (config?.sensitive) {
    return `<已设置,长度:${value.length}>`
  }
  
  return value
}

// 在模块加载时自动验证（仅在开发环境）
if (process.env.NODE_ENV === 'development') {
  const result = validateEnvironmentVariables()
  printValidationResult(result)
}