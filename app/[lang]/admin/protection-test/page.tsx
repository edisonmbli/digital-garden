'use client'

import { HybridProtectedContent } from '@/app/ui/hybrid-protected-content'
import { useEffect, useState } from 'react'

export default function ProtectionTestPage() {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
    console.log('🔍 [DEBUG] 测试页面已加载，开始调试保护机制');
    
    // 检查全局事件监听器
    const checkGlobalListeners = () => {
      console.log('🔍 [DEBUG] 检查全局事件监听器...');
      
      // 测试键盘事件
      const testKeyEvent = (e: KeyboardEvent) => {
        console.log('🔍 [DEBUG] 全局键盘事件被触发:', {
          key: e.key,
          code: e.code,
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          type: e.type
        });
      };
      
      // 测试复制事件
      const testCopyEvent = (e: ClipboardEvent) => {
        console.log('🔍 [DEBUG] 全局复制事件被触发:', {
          type: e.type,
          clipboardData: e.clipboardData
        });
      };
      
      // 添加测试监听器
      document.addEventListener('keydown', testKeyEvent, true);
      document.addEventListener('keyup', testKeyEvent, true);
      document.addEventListener('keypress', testKeyEvent, true);
      document.addEventListener('copy', testCopyEvent, true);
      document.addEventListener('cut', testCopyEvent, true);
      document.addEventListener('paste', testCopyEvent, true);
      
      console.log('🔍 [DEBUG] 测试事件监听器已添加');
      
      // 清理函数
      return () => {
        document.removeEventListener('keydown', testKeyEvent, true);
        document.removeEventListener('keyup', testKeyEvent, true);
        document.removeEventListener('keypress', testKeyEvent, true);
        document.removeEventListener('copy', testCopyEvent, true);
        document.removeEventListener('cut', testCopyEvent, true);
        document.removeEventListener('paste', testCopyEvent, true);
      };
    };
    
    const cleanup = checkGlobalListeners();
    
    // 检查内容保护库是否加载
    setTimeout(() => {
      console.log('🔍 [DEBUG] 检查内容保护库状态...');
      // @ts-expect-error - 检查全局window对象上的contentProtection属性
      if (window.contentProtection) {
        // @ts-expect-error - 访问全局window对象上的contentProtection属性
        console.log('🔍 [DEBUG] 内容保护库已加载:', window.contentProtection);
      } else {
        console.warn('⚠️ [DEBUG] 内容保护库未找到');
      }
    }, 1000);
    
    return cleanup;
  }, []);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">内容保护测试页面</h1>
      
      <div className="space-y-8">
        <div className="bg-yellow-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">测试说明</h2>
          <p>请尝试以下操作来测试内容保护：</p>
          <ul className="list-disc list-inside mt-2">
            <li>右键点击下方受保护的内容</li>
            <li>尝试选择文本（应该被允许）</li>
            <li>尝试使用 Cmd+C 复制文本（应该被阻止）</li>
            <li>尝试使用 Cmd+A 全选（应该被阻止）</li>
            <li>打开浏览器开发者工具查看控制台日志</li>
          </ul>
          {isClient && (
            <div className="mt-4 p-3 bg-blue-50 rounded">
              <h3 className="font-semibold text-blue-800">调试信息</h3>
              <p className="text-sm text-blue-700 mt-1">
                控制台会显示详细的调试信息，包括事件监听器状态、键盘事件触发情况等。
              </p>
            </div>
          )}
        </div>

        <HybridProtectedContent
          showWatermark={true}
          enableCopy={false}
          enableSelect={true}
          protectionLevel="enhanced"
          watermarkText="测试水印"
        >
          <div className={`bg-white p-6 rounded-lg shadow-lg${isClient ? ' protected-text' : ''}`}>
            <h2 className="text-2xl font-bold mb-4">受保护的内容</h2>
            <p className="mb-4">
              这是一段受保护的文本内容。你应该能够选择这些文字，但不能复制它们。
              如果保护机制正常工作，当你尝试使用 Cmd+C 复制时，应该会在控制台看到警告信息。
            </p>
            <p className="mb-4">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
              tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, 
              quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
            <div className="bg-gray-100 p-4 rounded">
              <h3 className="font-semibold mb-2">代码示例</h3>
              <code className="block">
                console.log(&apos;这段代码也应该受到保护&apos;);
                const protectedData = &apos;sensitive information&apos;;
              </code>
            </div>
          </div>
        </HybridProtectedContent>

        <div className="bg-green-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">普通内容（未保护）</h2>
          <p>这是普通的未受保护的内容，你应该能够正常复制和粘贴这些文字。</p>
        </div>

        {isClient && (
          <div className="bg-gray-100 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">调试工具</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                onClick={() => {
                  console.log('🧪 [TEST] 手动触发复制事件');
                  document.execCommand('copy');
                }}
              >
                测试复制命令
              </button>
              
              <button
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                onClick={() => {
                  console.log('🧪 [TEST] 手动触发键盘事件 Cmd+C');
                  const event = new KeyboardEvent('keydown', {
                    key: 'c',
                    metaKey: true,
                    bubbles: true,
                    cancelable: true
                  });
                  document.dispatchEvent(event);
                }}
              >
                模拟 Cmd+C
              </button>
              
              <button
                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                onClick={() => {
                  console.log('🧪 [TEST] 检查事件监听器');
                  // @ts-expect-error - 访问全局对象进行调试
                  const listeners = window.getEventListeners?.(document) || 'getEventListeners not available';
                  console.log('📋 [TEST] Document事件监听器:', listeners);
                }}
              >
                检查监听器
              </button>
              
              <button
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                onClick={() => {
                  console.log('🧪 [TEST] 尝试选择文本');
                  const selection = window.getSelection();
                  const range = document.createRange();
                  const textNode = document.querySelector('.protected-text');
                  if (textNode) {
                    range.selectNodeContents(textNode);
                    selection?.removeAllRanges();
                    selection?.addRange(range);
                    console.log('📋 [TEST] 选择结果:', selection?.toString());
                  }
                }}
              >
                测试文本选择
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}