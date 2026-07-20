import { t } from 'elysia'

export const createLinkBodySchema = t.Object({
  url: t.String({ format: 'uri' }),
})

export const createLinkResponseSchema = t.Object({
  code: t.String(),
  originalUrl: t.String(),
  shortUrl: t.String(),
})
