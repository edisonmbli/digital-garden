/**
 * 计算文本中的行数
 * @param text 输入的字符串
 * @returns 行数
 */
export function getLineCount(text: string): number {
  if (!text) return 0;
  return text.split('\n').length;
}

/**
 * 计算文本中的字符数
 * @param text 输入的字符串
 * @returns 字符数
 */
export function getCharacterCount(text: string): number {
  if (!text) return 0;
  return text.length;
}

/**
 * 计算文本中的单词数（混合中英文）
 * 中文每个汉字算一个词，英文单词按空格分割
 * @param text 输入的字符串
 * @returns 单词数
 */
export function getWordCount(text: string): number {
  if (!text) return 0;
  // 匹配中文字符
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
  // 匹配英文单词（包括数字）
  const englishWords = text.match(/[a-zA-Z0-9_]+/g) || [];
  return chineseChars.length + englishWords.length;
}

/**
 * 估算阅读时间（分钟）
 * @param text 输入的字符串
 * @returns 估算的阅读分钟数
 */
export function getReadingTime(text: string): number {
  if (!text) return 0;
  const wordCount = getWordCount(text);
  // 假设平均阅读速度为 200 字/分钟
  const wordsPerMinute = 200;
  const minutes = wordCount / wordsPerMinute;
  return Math.ceil(minutes);
}