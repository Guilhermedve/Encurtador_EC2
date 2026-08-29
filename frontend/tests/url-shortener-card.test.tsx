import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { UrlShortenerCard } from '../src/components/UrlShortenerCard'

describe('URL shortener cutting state', () => {
  test('blocks submission and announces cutting after API success', () => {
    const markup = renderToStaticMarkup(
      <UrlShortenerCard cutting onShortenSuccess={() => undefined} />,
    )

    expect(markup).toContain('disabled=""')
    expect(markup).toContain('aria-busy="true"')
    expect(markup).toContain('Cortando...')
    expect(markup).not.toContain('aria-label="Carregando"')
  })

  test('keeps the normal submit affordance while idle', () => {
    const markup = renderToStaticMarkup(
      <UrlShortenerCard cutting={false} onShortenSuccess={() => undefined} />,
    )

    expect(markup).not.toContain('disabled=""')
    expect(markup).toContain('Encurtar')
    expect(markup).not.toContain('Cortando...')
  })
})
