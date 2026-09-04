export function toISODate(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Returns true if the string is a valid 24-character MongoDB ObjectId hex string.
 * Prevents CastErrors from malformed IDs before the query hits the database.
 */
export function isValidObjectId(id: unknown): boolean {
  return typeof id === 'string' && /^[a-f\d]{24}$/i.test(id)
}

/**
 * Returns true if the string is a valid YYYY-MM-DD date.
 */
export function isValidDate(d: unknown): boolean {
  if (typeof d !== 'string') return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false
  const parsed = Date.parse(d)
  return !isNaN(parsed)
}

