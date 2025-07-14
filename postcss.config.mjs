// postcss.config.mjs

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // 1. 使用 @tailwindcss/postcss 插件
    tailwindcss: {},
    // 2. 自动添加浏览器前缀，增强兼容性
    autoprefixer: {},
  },
}

export default config
