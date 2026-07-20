export class InvalidHttpsUrlError extends Error {
  constructor(message = 'URL inválida') {
    super(message)
    this.name = 'InvalidHttpsUrlError'
  }
}

export function normalizeHttpsUrl(value: string): string {
  const trimmed = value.trim()

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new InvalidHttpsUrlError()
  }

  if (url.protocol !== 'https:') {
    throw new InvalidHttpsUrlError()
  }

  if (!url.hostname) {
    throw new InvalidHttpsUrlError()
  }

  return url.toString()
}
