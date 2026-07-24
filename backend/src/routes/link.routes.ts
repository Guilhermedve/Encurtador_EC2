import { Elysia } from 'elysia'
import { linkController } from '../controllers/link.controller'
import type { RateLimiter } from '../services/rate-limit.service'
import {
  createLinkBodySchema,
  createLinkResponseSchema,
  rateLimitErrorResponseSchema,
} from '../schemas/link.schema'
import { resolveClientIp } from '../utils/client-ip'

export interface LinkRoutesOptions {
  rateLimiter: RateLimiter
  trustProxy: boolean
}

export function createLinkRoutes({
  rateLimiter,
  trustProxy,
}: LinkRoutesOptions) {
  return new Elysia()
    .post(
      '/api/links',
      async ({ body, set }) => {
        const { reused, ...link } = await linkController.create(body.url)
        set.status = reused ? 200 : 201
        return link
      },
      {
        beforeHandle({ request, server, set }) {
          const clientIp = resolveClientIp({
            request,
            directAddress: server?.requestIP(request)?.address,
            trustProxy,
          })
          const decision = rateLimiter.consume(clientIp)

          set.headers['RateLimit-Limit'] = String(decision.limit)
          set.headers['RateLimit-Remaining'] = String(decision.remaining)
          set.headers['RateLimit-Reset'] = String(
            decision.resetAfterSeconds,
          )

          if (!decision.allowed) {
            set.status = 429
            set.headers['Retry-After'] = String(
              decision.resetAfterSeconds,
            )
            return {
              error: 'Muitas requisições. Tente novamente em instantes.',
            }
          }
        },
        body: createLinkBodySchema,
        response: {
          200: createLinkResponseSchema,
          201: createLinkResponseSchema,
          429: rateLimitErrorResponseSchema,
        },
      },
    )
    .get('/:code', async ({ params, redirect, set }) => {
      const originalUrl = await linkController.findOriginalUrl(params.code)

      if (!originalUrl) {
        set.status = 404
        return { error: 'Link não encontrado' }
      }

      return redirect(originalUrl, 302)
    })
}
