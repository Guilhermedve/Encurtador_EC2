import { describe, expect, it } from 'bun:test'
import { resolveClientIp } from '../src/utils/client-ip'

function requestWithForwardedFor(value?: string): Request {
  return new Request('http://localhost/api/links', {
    headers: value ? { 'X-Forwarded-For': value } : undefined,
  })
}

describe('resolveClientIp', () => {
  it('ignora X-Forwarded-For quando o proxy não é confiável', () => {
    expect(
      resolveClientIp({
        request: requestWithForwardedFor('203.0.113.99'),
        directAddress: '198.51.100.10',
        trustProxy: false,
      }),
    ).toBe('198.51.100.10')
  })

  it('usa o primeiro endereço encaminhado quando o proxy é confiável', () => {
    expect(
      resolveClientIp({
        request: requestWithForwardedFor(
          ' 203.0.113.99, 198.51.100.200 ',
        ),
        directAddress: '198.51.100.10',
        trustProxy: true,
      }),
    ).toBe('203.0.113.99')
  })

  it('usa o endereço direto quando o cabeçalho confiável está vazio', () => {
    expect(
      resolveClientIp({
        request: requestWithForwardedFor('   '),
        directAddress: '198.51.100.10',
        trustProxy: true,
      }),
    ).toBe('198.51.100.10')
  })

  it('usa unknown quando nenhum endereço está disponível', () => {
    expect(
      resolveClientIp({
        request: requestWithForwardedFor(),
        directAddress: null,
        trustProxy: false,
      }),
    ).toBe('unknown')
  })
})
