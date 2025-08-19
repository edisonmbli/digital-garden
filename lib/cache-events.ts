'use client'

// 简单的事件系统，用于在缓存操作后通知监控组件刷新
type CacheEventListener = () => void

class CacheEventEmitter {
  private listeners: CacheEventListener[] = []

  subscribe(listener: CacheEventListener): () => void {
    this.listeners.push(listener)
    
    // 返回取消订阅函数
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  emit(): void {
    this.listeners.forEach(listener => {
      try {
        listener()
      } catch (error) {
        console.error('Error in cache event listener:', error)
      }
    })
  }
}

// 全局事件发射器实例
export const cacheEventEmitter = new CacheEventEmitter()

// 便捷函数
export const notifyCacheUpdate = () => cacheEventEmitter.emit()
export const subscribeToCacheUpdates = (listener: CacheEventListener) => 
  cacheEventEmitter.subscribe(listener)