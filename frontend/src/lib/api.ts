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

function uniq(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function configuredApiBases(): string[] {
  const primary = process.env.NEXT_PUBLIC_API_URL
  const additional = process.env.NEXT_PUBLIC_API_URLS || ''
  const parsed = [
    primary || '',
    ...additional.split(',').map((item) => item.trim()),
  ]
    .map((item) => (item ? normalizeApiBase(item) : ''))
    .filter(Boolean)

  return uniq(parsed)
}

export function getApiBaseUrl(): string {
  const bases = configuredApiBases()
  return bases[0] || ''
}

export function getApiBaseCandidates(): string[] {
  const configured = configuredApiBases()
  const candidates: string[] = [...configured]

  if (typeof window !== 'undefined') {
    // Same-origin proxy fallback (Next.js rewrites) if direct backend has issues.
    candidates.unshift('')
  }

  // In non-browser contexts, same-origin path fallback is harmless.
  if (typeof window === 'undefined') {
    candidates.push('')
  }

  return uniq(candidates)
}

export async function fetchApi(path: string, init: RequestInit = {}): Promise<Response> {
  const candidates = getApiBaseCandidates()
  let lastError: unknown

  for (const base of candidates) {
    const url = `${base}${path}`
    try {
      const res = await fetch(url, init)
      // Retry next candidate when proxy/backend is unavailable.
      const isRetryableStatus =
        [502, 503, 504].includes(res.status) ||
        (base === '' && res.status === 404) ||
        (base === '' && res.status === 500)

      if (isRetryableStatus && base !== candidates[candidates.length - 1]) {
        lastError = new Error(`Gateway error (${res.status}) from ${url}`)
        continue
      }
      return res
    } catch (error) {
      lastError = error
      continue
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to reach API')
}
