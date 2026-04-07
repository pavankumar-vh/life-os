function trimTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

function normalizeApiBase(raw: string): string {
  const trimmed = trimTrailingSlash(raw.trim())
  if (!trimmed) return ''
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  if (trimmed.startsWith('localhost') || trimmed.startsWith('127.0.0.1')) return `http://${trimmed}`
  return `https://${trimmed}`
}

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL
  if (!raw) return ''
  return normalizeApiBase(raw)
}
