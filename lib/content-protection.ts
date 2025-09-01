// 内容保护工具函数
// 提供多层次的内容保护机制

// 禁用的键盘快捷键列表
const DISABLED_SHORTCUTS = [
  // 复制相关
  { ctrl: true, key: 'c' },
  { ctrl: true, key: 'a' },
  { ctrl: true, key: 'v' },
  { ctrl: true, key: 'x' },
  { ctrl: true, key: 's' },
  { ctrl: true, key: 'p' },

  // Mac 快捷键
  { meta: true, key: 'c' },
  { meta: true, key: 'a' },
  { meta: true, key: 'v' },
  { meta: true, key: 'x' },
  { meta: true, key: 's' },
  { meta: true, key: 'p' },

  // 开发者工具
  { key: 'F12' },
  { ctrl: true, shift: true, key: 'I' },
  { ctrl: true, shift: true, key: 'J' },
  { ctrl: true, shift: true, key: 'C' },
  { meta: true, alt: true, key: 'I' },
  { meta: true, alt: true, key: 'J' },
  { meta: true, alt: true, key: 'C' },

  // 查看源代码
  { ctrl: true, key: 'u' },
  { meta: true, key: 'u' },

  // 刷新
  { key: 'F5' },
  { ctrl: true, key: 'r' },
  { meta: true, key: 'r' },
]

// 检查是否为禁用的快捷键
function isDisabledShortcut(event: KeyboardEvent): boolean {
  return DISABLED_SHORTCUTS.some((shortcut) => {
    // 精确匹配修饰键：如果快捷键定义了某个修饰键，则必须匹配；如果没有定义，则该修饰键必须为false
    const ctrlMatch =
      shortcut.ctrl !== undefined
        ? shortcut.ctrl === event.ctrlKey
        : !event.ctrlKey
    const metaMatch =
      shortcut.meta !== undefined
        ? shortcut.meta === event.metaKey
        : !event.metaKey
    const shiftMatch =
      shortcut.shift !== undefined
        ? shortcut.shift === event.shiftKey
        : !event.shiftKey
    const altMatch =
      shortcut.alt !== undefined ? shortcut.alt === event.altKey : !event.altKey
    const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()

    return ctrlMatch && metaMatch && shiftMatch && altMatch && keyMatch
  })
}

// 键盘事件处理器
function handleKeyDown(event: KeyboardEvent): void {
  if (isDisabledShortcut(event)) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
  }
}

// 右键菜单处理器
function handleContextMenu(event: MouseEvent): void {
  event.preventDefault()
  event.stopPropagation()
}

// 选择文本处理器
function handleSelectStart(event: Event): void {
  event.preventDefault()
  event.stopPropagation()
}

// 拖拽处理器
function handleDragStart(event: DragEvent): void {
  event.preventDefault()
  event.stopPropagation()
}

// 打印处理器
function handleBeforePrint(event: Event): void {
  event.preventDefault()
  alert('此内容受版权保护，不允许打印')
}

// 截图检测（实验性功能）
function detectScreenshot(): void {
  // 检测页面失焦（可能是截图工具激活）
  let isBlurred = false

  window.addEventListener('blur', () => {
    isBlurred = true
    setTimeout(() => {
      if (isBlurred) {
        console.warn('检测到可能的截图行为')
        // 可以在这里添加更多保护措施
      }
    }, 100)
  })

  window.addEventListener('focus', () => {
    isBlurred = false
  })
}

// 禁用开发者工具（实验性）
function disableDevTools(): void {
  // 检测开发者工具是否打开
  const devtools = { open: false, orientation: null }

  setInterval(() => {
    if (
      window.outerHeight - window.innerHeight > 200 ||
      window.outerWidth - window.innerWidth > 200
    ) {
      if (!devtools.open) {
        devtools.open = true
        console.clear()
        console.warn('开发者工具已被检测到')
        // 可以在这里添加更多保护措施，如重定向页面
      }
    } else {
      devtools.open = false
    }
  }, 500)
}

// 移动端特殊保护
function setupMobileProtection(): void {
  // 禁用长按菜单
  document.addEventListener(
    'touchstart',
    (event) => {
      if (event.touches.length > 1) {
        event.preventDefault()
      }
    },
    { passive: false }
  )

  // 禁用双击缩放
  let lastTouchEnd = 0
  document.addEventListener(
    'touchend',
    (event) => {
      const now = new Date().getTime()
      if (now - lastTouchEnd <= 300) {
        event.preventDefault()
      }
      lastTouchEnd = now
    },
    false
  )

  // 禁用捏合缩放
  document.addEventListener('gesturestart', (event) => {
    event.preventDefault()
  })

  document.addEventListener('gesturechange', (event) => {
    event.preventDefault()
  })

  document.addEventListener('gestureend', (event) => {
    event.preventDefault()
  })
}

// 主要的保护初始化函数
export function initializeContentProtection(
  options: {
    disableRightClick?: boolean
    disableSelection?: boolean
    disableKeyboardShortcuts?: boolean
    disablePrint?: boolean
    enableScreenshotDetection?: boolean
    enableDevToolsDetection?: boolean
    enableMobileProtection?: boolean
  } = {}
): () => void {
  // 将保护库暴露到全局对象上以便调试
  if (typeof window !== 'undefined') {
    // @ts-expect-error - 故意添加到window对象上
    window.contentProtection = {
      version: '1.0.0',
      initialized: true,
      options,
      utils: {
        isDisabledShortcut,
        getUserAgentProtection,
        protectElement,
      },
    }
  }
  const {
    disableRightClick = true,
    disableSelection = true,
    disableKeyboardShortcuts = true,
    disablePrint = true,
    enableScreenshotDetection = false,
    enableDevToolsDetection = false,
    enableMobileProtection = true,
  } = options

  const cleanup: (() => void)[] = []

  // 键盘快捷键保护
  if (disableKeyboardShortcuts) {
    // 监听所有键盘事件
    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('keyup', handleKeyDown, true)
    document.addEventListener('keypress', handleKeyDown, true)

    // 直接监听复制粘贴事件
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    document.addEventListener('copy', handleCopy, true)
    document.addEventListener('paste', handlePaste, true)
    document.addEventListener('cut', handleCut, true)

    cleanup.push(() => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('keyup', handleKeyDown, true)
      document.removeEventListener('keypress', handleKeyDown, true)
      document.removeEventListener('copy', handleCopy, true)
      document.removeEventListener('paste', handlePaste, true)
      document.removeEventListener('cut', handleCut, true)
    })
  }

  // 右键菜单保护
  if (disableRightClick) {
    document.addEventListener('contextmenu', handleContextMenu, true)
    cleanup.push(() =>
      document.removeEventListener('contextmenu', handleContextMenu, true)
    )
  }

  // 文本选择保护
  if (disableSelection) {
    document.addEventListener('selectstart', handleSelectStart, true)
    cleanup.push(() =>
      document.removeEventListener('selectstart', handleSelectStart, true)
    )
  }

  // 拖拽保护
  document.addEventListener('dragstart', handleDragStart, true)
  cleanup.push(() =>
    document.removeEventListener('dragstart', handleDragStart, true)
  )

  // 打印保护
  if (disablePrint) {
    window.addEventListener('beforeprint', handleBeforePrint, true)
    cleanup.push(() =>
      window.removeEventListener('beforeprint', handleBeforePrint, true)
    )
  }

  // 截图检测
  if (enableScreenshotDetection) {
    detectScreenshot()
  }

  // 开发者工具检测
  if (enableDevToolsDetection) {
    disableDevTools()
  }

  // 移动端保护
  if (enableMobileProtection && /Mobi|Android/i.test(navigator.userAgent)) {
    setupMobileProtection()
  }

  // 返回清理函数
  return () => {
    cleanup.forEach((fn) => fn())
  }
}

// 为特定元素添加保护
export function protectElement(
  element: HTMLElement,
  protectionLevel: 'basic' | 'enhanced' | 'maximum' = 'enhanced'
): void {
  // 添加CSS类
  element.classList.add('content-protected')

  if (protectionLevel === 'enhanced') {
    element.classList.add('content-protected-enhanced')
  } else if (protectionLevel === 'maximum') {
    element.classList.add('content-protected-maximum')
  }

  // 添加内联样式作为备用
  const styles = {
    userSelect: 'none' as const,
    WebkitUserSelect: 'none' as const,
    MozUserSelect: 'none' as const,
    msUserSelect: 'none' as const,
    WebkitTouchCallout: 'none' as const,
    WebkitTapHighlightColor: 'transparent' as const,
  }

  Object.assign(element.style, styles)

  // 为所有子元素也添加保护
  const allElements = element.querySelectorAll('*')
  allElements.forEach((el) => {
    if (el instanceof HTMLElement) {
      Object.assign(el.style, styles)
    }
  })
}

// 检测用户代理以应用特定保护
export function getUserAgentProtection(): {
  isMobile: boolean
  isIOS: boolean
  isAndroid: boolean
  isMac: boolean
  isWindows: boolean
} {
  const userAgent = navigator.userAgent

  return {
    isMobile: /Mobi|Android/i.test(userAgent),
    isIOS: /iPad|iPhone|iPod/.test(userAgent),
    isAndroid: /Android/.test(userAgent),
    isMac: /Mac/.test(userAgent),
    isWindows: /Win/.test(userAgent),
  }
}
