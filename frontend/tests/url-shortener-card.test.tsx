import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  canSubmitShorten,
  submitShortenRequest,
  UrlShortenerCard,
} from '../src/components/UrlShortenerCard'
import { completeCut, startCut } from '../src/pages/HomePage'
import { CUT_TIMING } from '../src/components/ascii-scissors/cutAnimation'

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

  test('orders API success before the success callback exactly once', async () => {
    const events: string[] = []
    const result = await submitShortenRequest(
      'https://example.com',
      async () => {
        events.push('api')
        return {
          code: 'abc',
          originalUrl: 'https://example.com',
          shortUrl: 'https://sho.rt/abc',
        }
      },
      () => events.push('success'),
    )

    expect(result.shortUrl).toBe('https://sho.rt/abc')
    expect(events).toEqual(['api', 'success'])
  })

  test('does not call success callback when the API fails', async () => {
    let callbackCount = 0

    await expect(
      submitShortenRequest(
        'https://example.com',
        async () => {
          throw new Error('request failed')
        },
        () => callbackCount++,
      ),
    ).rejects.toThrow('request failed')

    expect(callbackCount).toBe(0)
  })

  test('blocks repeated submits while loading or cutting', () => {
    expect(canSubmitShorten(false, false)).toBe(true)
    expect(canSubmitShorten(true, false)).toBe(false)
    expect(canSubmitShorten(false, true)).toBe(false)
  })

  test('keeps stale completion from unlocking the newest request', () => {
    const first = startCut({ requestId: 0, cutting: false })
    const second = startCut(first)

    expect(completeCut(second, first.requestId)).toBe(second)
    expect(completeCut(second, second.requestId)).toEqual({
      requestId: second.requestId,
      cutting: false,
    })
  })

  test('watchdog completion uses the same stale-safe transition', () => {
    const state = startCut({ requestId: 4, cutting: false })

    expect(CUT_TIMING.watchdogMs).toBeGreaterThan(CUT_TIMING.totalMs)
    expect(completeCut(state, state.requestId)).toEqual({
      requestId: 5,
      cutting: false,
    })
  })
})
