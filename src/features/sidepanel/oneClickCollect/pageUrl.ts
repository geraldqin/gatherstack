export function normalizePageUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}${parsed.search}`
  } catch {
    return url.trim()
  }
}

export function pageUrlsEqual(a: string, b: string): boolean {
  return normalizePageUrl(a) === normalizePageUrl(b)
}
