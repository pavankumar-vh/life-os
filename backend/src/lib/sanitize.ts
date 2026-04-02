/** Strip fields that should never come from user input */
export function sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userId, _id, __v, __proto__: _p, constructor: _c, prototype: _pt, ...rest } = body
  // Remove any keys starting with $ (MongoDB operator injection)
  for (const key of Object.keys(rest)) {
    if (key.startsWith('$')) {
      delete rest[key]
    }
  }
  return rest
}
