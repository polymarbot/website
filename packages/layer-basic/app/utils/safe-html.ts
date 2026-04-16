import DOMPurify from 'dompurify'

/**
 * Sanitize HTML string to prevent XSS attacks
 * @param html - The untrusted HTML string
 * @returns Sanitized HTML string safe for v-html rendering
 */
export function safeHtml (html: string): string {
  return DOMPurify.sanitize(html)
}
