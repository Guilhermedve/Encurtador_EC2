import { Elysia } from 'elysia'
import { linkController } from '../controllers/link.controller'
import {
  createLinkBodySchema,
  createLinkResponseSchema,
} from '../schemas/link.schema'

export const linkRoutes = new Elysia()
  .post(
    '/api/links',
    ({ body, set }) => {
      set.status = 201
      return linkController.create(body.url)
    },
    {
      body: createLinkBodySchema,
      response: { 201: createLinkResponseSchema },
    },
  )
  .get('/:code', ({ params, redirect, set }) => {
    const originalUrl = linkController.findOriginalUrl(params.code)

    if (!originalUrl) {
      set.status = 404
      return { error: 'Link não encontrado' }
    }

    return redirect(originalUrl, 302)
  })
