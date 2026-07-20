import { describe, expect, it } from 'bun:test'
import { generateCode } from '../src/utils/generate-code'

const BASE62 = /^[0-9a-zA-Z]+$/

describe('generateCode', () => {
  it('gera exatamente nove caracteres por padrão', () => {
    expect(generateCode()).toHaveLength(9)
  })

  it('respeita o tamanho solicitado', () => {
    expect(generateCode(5)).toHaveLength(5)
  })

  it('usa somente caracteres Base62', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateCode()).toMatch(BASE62)
    }
  })
})
