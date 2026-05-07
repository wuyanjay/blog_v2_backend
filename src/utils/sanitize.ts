import { JSDOM } from 'jsdom'
import createDOMPurify from 'dompurify'

const window = new JSDOM('').window
const DOMPurify = createDOMPurify(window)

export function sanitizeHtml(input: string) {
  return DOMPurify.sanitize(input ?? '')
}

export function plainTextExcerpt(input: string, max = 200) {
  const sanitized = sanitizeHtml(input)
  const plain = new JSDOM(sanitized).window.document.body.textContent || ''
  return plain.replace(/[#*`>\[\]!()_-]/g, '').trim().slice(0, max)
}
