import { describe, expect, it } from 'bun:test'
import { parseBoolean, parsePositiveInteger } from '../src/config/env'

describe('parsePositiveInteger', () => {
  it('usa o valor padrão quando a variável está ausente', () => {
    expect(parsePositiveInteger('RATE_LIMIT_MAX', undefined, 10)).toBe(10)
  })

  it('aceita um inteiro positivo configurado', () => {
    expect(parsePositiveInteger('RATE_LIMIT_MAX', '25', 10)).toBe(25)
  })

  it.each(['0', '-1', '1.5', 'texto'])(
    'rejeita o valor inválido %s',
    (value) => {
      expect(() =>
        parsePositiveInteger('RATE_LIMIT_MAX', value, 10),
      ).toThrow('RATE_LIMIT_MAX deve ser um número inteiro positivo')
    },
  )
})

describe('parseBoolean', () => {
  it('usa o valor padrão quando a variável está ausente', () => {
    expect(parseBoolean('TRUST_PROXY', undefined, false)).toBe(false)
  })

  it('aceita somente true e false', () => {
    expect(parseBoolean('TRUST_PROXY', 'true', false)).toBe(true)
    expect(parseBoolean('TRUST_PROXY', 'false', true)).toBe(false)
  })

  it('rejeita qualquer outro texto', () => {
    expect(() => parseBoolean('TRUST_PROXY', '1', false)).toThrow(
      'TRUST_PROXY deve ser true ou false',
    )
  })
})
