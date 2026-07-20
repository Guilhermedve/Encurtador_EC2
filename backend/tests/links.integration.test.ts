import { describe, expect, it } from 'bun:test'
import { app } from '../src/app'

function postLink(url: string) {
  return app.handle(
    new Request('http://localhost/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }),
  )
}

describe('POST /api/links', () => {
  it('cria um link novo e retorna 201', async () => {
    const response = await postLink('https://exemplo.com/nova')
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.code).toHaveLength(9)
    expect(body.originalUrl).toBe('https://exemplo.com/nova')
    expect(body.shortUrl).toBe(`http://localhost:3000/${body.code}`)
  })

  it('reutiliza a URL equivalente retornando 200 e o mesmo código', async () => {
    const first = await (await postLink('https://exemplo.com/reuso')).json()
    const response = await postLink('  https://exemplo.com/reuso  ')
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.code).toBe(first.code)
  })

  it('retorna 422 para entrada não HTTPS', async () => {
    const response = await postLink('http://exemplo.com')
    expect(response.status).toBe(422)
  })

  it('retorna 422 para texto que não é URL', async () => {
    const response = await postLink('apenas texto')
    expect(response.status).toBe(422)
  })
})

describe('GET /:code', () => {
  it('redireciona com 302 e cabeçalho Location para um código existente', async () => {
    const created = await (
      await postLink('https://exemplo.com/redir')
    ).json()

    const response = await app.handle(
      new Request(`http://localhost/${created.code}`, {
        redirect: 'manual',
      }),
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(
      'https://exemplo.com/redir',
    )
  })

  it('retorna 404 para código desconhecido', async () => {
    const response = await app.handle(
      new Request('http://localhost/inexistente'),
    )
    expect(response.status).toBe(404)
  })
})
