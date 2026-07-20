import { Elysia } from 'elysia'
import { linkController } from '../controllers/link.controller'
import {
  createLinkBodySchema,
  createLinkResponseSchema,
} from '../schemas/link.schema'

export const linkRoutes = new Elysia()
  .post(
    '/api/links',
    async ({ body, set }) => {
      const { reused, ...link } = await linkController.create(body.url)
      set.status = reused ? 200 : 201
      return link
    },
    {
      body: createLinkBodySchema,
      response: {
        200: createLinkResponseSchema,
        201: createLinkResponseSchema,
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
