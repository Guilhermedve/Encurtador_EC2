import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'
import { env } from './config/env'
import { errorHandler } from './middlewares/error-handler'
import { healthRoutes } from './routes/health.routes'
import { createLinkRoutes } from './routes/link.routes'
import {
  InMemoryRateLimiter,
  type RateLimiter,
} from './services/rate-limit.service'

export interface CreateAppOptions {
  rateLimiter?: RateLimiter
  trustProxy?: boolean
}

export function createApp(options: CreateAppOptions = {}) {
  const rateLimiter =
    options.rateLimiter ??
    new InMemoryRateLimiter({
      maxRequests: env.rateLimitMax,
      windowMs: env.rateLimitWindowSeconds * 1_000,
    })

  return new Elysia()
    .use(
      cors({
        origin: env.frontendUrl,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
      }),
    )
    .use(errorHandler)
    .use(healthRoutes)
    .use(
      createLinkRoutes({
        rateLimiter,
        trustProxy: options.trustProxy ?? env.trustProxy,
      }),
    )
}

export const app = createApp()
