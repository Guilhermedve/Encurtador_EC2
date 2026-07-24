export interface ResolveClientIpInput {
  request: Request
  directAddress: string | null | undefined
  trustProxy: boolean
}

export function resolveClientIp({
  request,
  directAddress,
  trustProxy,
}: ResolveClientIpInput): string {
  if (trustProxy) {
    const forwardedAddress = request.headers
      .get('x-forwarded-for')
      ?.split(',')[0]
      ?.trim()

    if (forwardedAddress) {
      return forwardedAddress
    }
  }

  return directAddress?.trim() || 'unknown'
}
