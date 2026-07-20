import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'
import { env } from './config/env'
import { errorHandler } from './middlewares/error-handler'
import { healthRoutes } from './routes/health.routes'
import { linkRoutes } from './routes/link.routes'

export const app = new Elysia()
  .use(
    cors({
      origin: env.frontendUrl,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    }),
  )
  .use(errorHandler)
  .use(healthRoutes)
  .use(linkRoutes)
