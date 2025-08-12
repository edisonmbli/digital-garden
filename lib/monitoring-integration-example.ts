/**
 * Sentry 监控系统集成示例
 * 展示如何在实际应用中使用监控组件
 */

import { monitoring, initializeMonitoring } from './monitoring';
import { performanceMonitor, measureFunction } from './performance-monitor';
import { businessMonitor, startUserJourney, monitorContentInteraction, monitorSearch, monitorApiError } from './business-monitor';

// 1. 初始化监控系统
export const setupMonitoring = async () => {
  await initializeMonitoring({
    environment: process.env.NODE_ENV as 'development' | 'production',
    enablePerformanceMonitoring: true,
    enableBusinessMonitoring: true,
    enableErrorTracking: true,
    enableAlerts: process.env.NODE_ENV === 'production',
    sentry: {
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN!,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0
    }
  });
  return monitoring;
};

// 2. 在 Next.js App Router 中的使用示例
// 注意：实际的 ErrorBoundary 组件应该在 app/ui/error-boundary.tsx 中导入和使用

// 3. 在 Server Actions 中的错误监控
export const monitoredServerAction = async () => {
  try {
    // 开始用户旅程
    await startUserJourney('form_submission', 'form_start');
    
    // 业务逻辑
    const result = await someBusinessLogic();
    
    // 记录成功的业务事件
    await businessMonitor.recordBusinessEvent({
      action: 'form_submission_success',
      category: 'user_action',
      severity: 'low',
      metadata: { formType: 'contact' }
    });
    
    return { success: true, data: result };
  } catch (error) {
    // 捕获并报告错误
    await businessMonitor.recordBusinessEvent({
      action: 'form_submission_error',
      category: 'error_recovery',
      severity: 'medium',
      metadata: { error: (error as Error).message }
    });
    
    return { success: false, error: 'Submission failed' };
  }
};

// 4. 在 API Routes 中的性能监控
export const monitoredApiHandler = async (request: Request) => {
  try {
    // API 逻辑 - 使用性能监控
    const result = await measureFunction(
      'api_request',
      () => processApiRequest(),
      1000 // 1秒阈值
    );
    
    return Response.json(result);
  } catch (error) {
    // 记录 API 错误
    await monitorApiError(
      new URL(request.url).pathname,
      request.method,
      500,
      (error as Error).message
    );
    
    throw error;
  }
};

// 5. 在客户端组件中的用户行为监控
export const useUserBehaviorMonitoring = () => {
  const trackUserAction = async (action: 'like' | 'comment' | 'share' | 'view', contentId: string, duration?: number) => {
    await monitorContentInteraction(action, contentId, duration);
  };
  
  const trackPageView = async (page: string) => {
    await startUserJourney(`page_view_${page}`, 'page_load');
  };
  
  const trackSearch = async (query: string, resultsCount: number, responseTime: number) => {
    await monitorSearch(query, resultsCount, responseTime);
  };
  
  return { trackUserAction, trackPageView, trackSearch };
};

// 6. 性能监控的实际应用
export const setupPerformanceMonitoring = () => {
  // 性能监控会在 performanceMonitor 初始化时自动设置
  // 可以记录自定义性能指标
  performanceMonitor.recordMetric({
    name: 'app_initialization',
    value: Date.now(),
    unit: 'ms',
    context: { component: 'performance_setup' }
  });
};

// 7. 错误边界的实际使用示例
// 注意：这个示例展示了如何在实际组件中使用 ErrorBoundary
// 实际使用时需要在 .tsx 文件中导入 ErrorBoundary 组件
export const createPageWithErrorBoundary = () => {
  // 返回一个配置对象，用于在 .tsx 文件中创建错误边界
  return {
    fallbackComponent: {
      className: "min-h-screen flex items-center justify-center",
      content: {
        title: "出现了一些问题",
        message: "我们已经记录了这个错误，正在努力修复。",
        buttonText: "重试"
      }
    }
  };
};

// 8. 业务监控的实际应用
export const trackBusinessMetrics = {
  // 用户注册
  userRegistration: async (userId: string, method: string) => {
    await startUserJourney(`user_registration_${userId}`, 'registration_start');
    await businessMonitor.recordBusinessEvent({
      action: 'user_registration',
      category: 'user_action',
      severity: 'medium',
      metadata: { userId, method },
      userId
    });
  },
  
  // 内容互动
  contentLike: async (contentId: string) => {
    await monitorContentInteraction('like', contentId);
  },
  
  // 搜索行为
  searchQuery: async (query: string, results: number, responseTime: number) => {
    await monitorSearch(query, results, responseTime);
  }
};

// 辅助函数（示例）
const someBusinessLogic = async () => {
  // 模拟业务逻辑
  return { id: '123', status: 'processed' };
};

const processApiRequest = async () => {
  // 模拟 API 处理
  return { data: 'processed', timestamp: new Date() };
};