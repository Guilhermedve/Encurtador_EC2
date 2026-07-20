export function generateCode(size = 7): string {
  const alphabet =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

  return Array.from(
    { length: size },
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join('')
}
