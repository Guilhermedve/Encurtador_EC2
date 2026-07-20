import { t } from 'elysia'

// Validação estrutural apenas. A regra semântica de HTTPS vive em
// normalizeHttpsUrl, para ser exercitada fora da camada HTTP.
export const createLinkBodySchema = t.Object({
  url: t.String({ minLength: 1 }),
})

export const createLinkResponseSchema = t.Object({
  code: t.String(),
  originalUrl: t.String(),
  shortUrl: t.String(),
})
