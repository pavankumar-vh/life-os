function trimTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL
  if (!raw) return ''
  return trimTrailingSlash(raw)
}
