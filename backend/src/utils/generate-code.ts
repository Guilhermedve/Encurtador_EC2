const ALPHABET =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

// 248 é o maior múltiplo de 62 que cabe em um byte (0-255). Bytes >= 248
// são descartados (amostragem por rejeição) para evitar viés modular.
const REJECTION_THRESHOLD = 248

export const SHORT_CODE_SIZE = 8

export function generateCode(size = SHORT_CODE_SIZE): string {
  let result = ''
  const buffer = new Uint8Array(size)

  while (result.length < size) {
    crypto.getRandomValues(buffer)

    for (let i = 0; i < buffer.length && result.length < size; i++) {
      const byte = buffer[i]!
      if (byte >= REJECTION_THRESHOLD) {
        continue
      }
      result += ALPHABET[byte % 62]
    }
  }

  return result
}
