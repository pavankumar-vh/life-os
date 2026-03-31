/** Strip fields that should never come from user input */
export function sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const { userId, _id, __v, ...rest } = body
  return rest
}
