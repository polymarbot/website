/**
 * 等待指定毫秒
 * @param ms
 * @returns {Promise<any>}
 */
export function sleep (ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 安全解析Json
 * @param str - 需要解析的字符串
 * @param defaultValue - 解析失败时的默认值
 */
export function safeJsonParse<T extends object | unknown[]> (str?: string, defaultValue?: T): T {
  try {
    return JSON.parse(str!)
  } catch (e) {
    console.error(e)
    return defaultValue ?? {} as T
  }
}

/**
 * 判断字符串是否为 URL
 * @param str - 需要判断的字符串
 * @returns 是否为 URL
 */
export function isUrl (str: string): boolean {
  return str.startsWith('http://') || str.startsWith('https://')
}
