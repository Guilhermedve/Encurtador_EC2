import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'
import { env } from './config/env'
import { errorHandler } from './middlewares/error-handler'
import { createLinkController } from './controllers/link.controller'
import { createLinkRepository } from './repositories/link-repository.factory'
import type { LinkRepository } from './repositories/link.repository'
import { healthRoutes } from './routes/health.routes'
import { createLinkRoutes } from './routes/link.routes'
import { LinkService } from './services/link.service'
import {
  InMemoryRateLimiter,
  type RateLimiter,
} from './services/rate-limit.service'

export interface CreateAppOptions {
  linkRepository?: LinkRepository
  rateLimiter?: RateLimiter
  trustProxy?: boolean
}

export function createApp(options: CreateAppOptions = {}) {
  const repository = options.linkRepository ?? createLinkRepository(env)
  const linkService = new LinkService(repository)
  const linkController = createLinkController(linkService)
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
        controller: linkController,
        rateLimiter,
        trustProxy: options.trustProxy ?? env.trustProxy,
      }),
    )
}

export const app = createApp()
