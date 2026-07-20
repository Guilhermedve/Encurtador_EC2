import { describe, expect, it } from 'bun:test'
import {
  InvalidHttpsUrlError,
  normalizeHttpsUrl,
} from '../src/utils/normalize-url'

describe('normalizeHttpsUrl', () => {
  it('aceita e normaliza uma URL HTTPS', () => {
    expect(normalizeHttpsUrl('https://exemplo.com/pagina')).toBe(
      'https://exemplo.com/pagina',
    )
  })

  it('remove espaços externos', () => {
    expect(normalizeHttpsUrl('  https://exemplo.com  ')).toBe(
      'https://exemplo.com/',
    )
  })

  it('rejeita texto comum', () => {
    expect(() => normalizeHttpsUrl('apenas texto')).toThrow(
      InvalidHttpsUrlError,
    )
  })

  it('rejeita URL relativa', () => {
    expect(() => normalizeHttpsUrl('/caminho/relativo')).toThrow(
      InvalidHttpsUrlError,
    )
  })

  it('rejeita protocolos diferentes de HTTPS', () => {
    expect(() => normalizeHttpsUrl('http://exemplo.com')).toThrow(
      InvalidHttpsUrlError,
    )
    expect(() => normalizeHttpsUrl('ftp://exemplo.com')).toThrow(
      InvalidHttpsUrlError,
    )
    expect(() => normalizeHttpsUrl('file:///tmp/x')).toThrow(
      InvalidHttpsUrlError,
    )
  })
})
