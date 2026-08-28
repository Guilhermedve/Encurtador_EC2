import { describe, expect, it } from 'bun:test'
import {
  parseBoolean,
  parseLinkRepositoryKind,
  parsePositiveInteger,
  requireHttpsUrl,
} from '../src/config/env'

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

describe('parseLinkRepositoryKind', () => {
  it('aceita memory fora de produção', () => {
    expect(parseLinkRepositoryKind('memory', 'development')).toBe('memory')
  })

  it('aceita azure-table', () => {
    expect(parseLinkRepositoryKind('azure-table', 'development')).toBe(
      'azure-table',
    )
  })

  it('rejeita um valor desconhecido', () => {
    expect(() => parseLinkRepositoryKind('postgres', 'development')).toThrow()
  })

  it('usa memory por padrão fora de produção', () => {
    expect(parseLinkRepositoryKind(undefined, 'development')).toBe('memory')
  })

  it('exige LINK_REPOSITORY em produção', () => {
    expect(() => parseLinkRepositoryKind(undefined, 'production')).toThrow()
  })

  it('rejeita memory em produção', () => {
    expect(() => parseLinkRepositoryKind('memory', 'production')).toThrow()
  })
})

describe('requireHttpsUrl', () => {
  it('aceita um endpoint HTTPS do Azure Table', () => {
    expect(
      requireHttpsUrl(
        'AZURE_STORAGE_ACCOUNT_URL',
        'https://conta.table.core.windows.net',
      ),
    ).toBe('https://conta.table.core.windows.net')
  })

  it('rejeita valor ausente', () => {
    expect(() => requireHttpsUrl('AZURE_STORAGE_ACCOUNT_URL', undefined)).toThrow(
      'AZURE_STORAGE_ACCOUNT_URL é obrigatório',
    )
  })

  it('rejeita HTTP', () => {
    expect(() =>
      requireHttpsUrl('AZURE_STORAGE_ACCOUNT_URL', 'http://conta.table.core.windows.net'),
    ).toThrow('AZURE_STORAGE_ACCOUNT_URL deve usar HTTPS')
  })

  it('rejeita URL malformada', () => {
    expect(() =>
      requireHttpsUrl('AZURE_STORAGE_ACCOUNT_URL', 'nao-e-url'),
    ).toThrow('AZURE_STORAGE_ACCOUNT_URL deve ser uma URL válida')
  })
})
