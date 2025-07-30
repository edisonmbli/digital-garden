import { useState, useEffect } from 'react'

interface PhotoDimensions {
  width: number
  height: number
}

interface ViewportDimensions {
  width: number
  height: number
}

interface ModalDimensions {
  width: number
  height: number
  photoHeight: number
}

/**
 * 动态计算模态框最优尺寸的Hook
 * 基于照片比例和视口尺寸，计算最适合的模态框尺寸
 */
export function useOptimalModalSize(photo?: PhotoDimensions) {
  const [viewport, setViewport] = useState<ViewportDimensions>({
    width: 0,
    height: 0,
  })
  const [modalDimensions, setModalDimensions] =
    useState<ModalDimensions | null>(null)

  // 监听视口尺寸变化
  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  // 计算最优模态框尺寸
  useEffect(() => {
    if (!photo || !viewport.width || !viewport.height) {
      setModalDimensions(null)
      return
    }

    const dimensions = calculateOptimalModalSize(photo, viewport)
    setModalDimensions(dimensions)
  }, [photo?.width, photo?.height, viewport.width, viewport.height])

  return modalDimensions
}

/**
 * 核心算法：计算最优模态框尺寸
 */
function calculateOptimalModalSize(
  photo: PhotoDimensions,
  viewport: ViewportDimensions
): ModalDimensions {
  // 配置参数 - 优化为更大的显示尺寸
  const MARGIN_RATIO = 0.025 // 2.5% 边距（减少边距）
  const INFO_SECTION_MIN_HEIGHT = 120 // 中下层最小高度（px）
  const INFO_SECTION_RATIO = 0.2 // 中下层占比（20%，减少信息区域占比）
  const MAX_VIEWPORT_USAGE = 0.98 // 最大视口使用率95%

  const photoRatio = photo.width / photo.height
  const viewportRatio = viewport.width / viewport.height

  // 可用空间（减去边距）
  const availableWidth = viewport.width * (1 - MARGIN_RATIO * 2)
  const availableHeight = viewport.height * (1 - MARGIN_RATIO * 2)

  let modalWidth: number
  let modalHeight: number
  let photoHeight: number

  if (viewportRatio > photoRatio) {
    // 横屏环境：高度是限制因素，优化为更大尺寸
    const targetHeight = availableHeight * MAX_VIEWPORT_USAGE
    const maxPhotoHeight = targetHeight - INFO_SECTION_MIN_HEIGHT
    photoHeight = Math.min(
      maxPhotoHeight,
      targetHeight * (1 - INFO_SECTION_RATIO)
    )

    modalWidth = Math.min(photoHeight * photoRatio, availableWidth)
    modalHeight = photoHeight + INFO_SECTION_MIN_HEIGHT
  } else {
    // 竖屏环境：宽度是限制因素，优化为更大尺寸
    modalWidth = availableWidth * MAX_VIEWPORT_USAGE
    photoHeight = modalWidth / photoRatio

    // 确保总高度不超过可用高度
    const maxModalHeight = availableHeight * MAX_VIEWPORT_USAGE
    const minInfoHeight = INFO_SECTION_MIN_HEIGHT

    if (photoHeight + minInfoHeight > maxModalHeight) {
      // 需要压缩照片高度
      photoHeight = maxModalHeight - minInfoHeight
      modalWidth = photoHeight * photoRatio
    }

    modalHeight = photoHeight + minInfoHeight
  }

  // 确保不超出视口边界（保持95%限制）
  modalWidth = Math.min(modalWidth, availableWidth * MAX_VIEWPORT_USAGE)
  modalHeight = Math.min(modalHeight, availableHeight * MAX_VIEWPORT_USAGE)

  return {
    width: Math.round(modalWidth),
    height: Math.round(modalHeight),
    photoHeight: Math.round(photoHeight),
  }
}

/**
 * 获取响应式样式对象
 */
export function getModalStyles(dimensions: ModalDimensions | null) {
  if (!dimensions) {
    return {
      modal: {},
      photo: {},
    }
  }

  return {
    modal: {
      width: `${dimensions.width}px`,
      height: `${dimensions.height}px`,
      maxWidth: '95vw',
      maxHeight: '95vh',
    },
    photo: {
      height: `${dimensions.photoHeight}px`,
    },
  }
}
