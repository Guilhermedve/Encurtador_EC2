import { useState, useCallback } from 'react'

interface ResultDisplayProps {
  shortUrl: string
}

export function ResultDisplay({ shortUrl }: ResultDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shortUrl)
    } catch {
      const el = document.createElement('textarea')
      el.value = shortUrl
      el.setAttribute('readonly', '')
      el.style.position = 'absolute'
      el.style.left = '-9999px'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }, [shortUrl])

  return (
    <div
      aria-live="polite"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-sm border border-white/20 bg-white/[0.04] px-4 py-3"
    >
      <a
        href={shortUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="truncate text-sm font-bold tracking-wide text-white underline decoration-white/30 underline-offset-4 hover:decoration-white break-all"
      >
        {shortUrl}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 rounded-sm border border-white bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-black transition-colors duration-200 hover:bg-black hover:text-white hover:border-white cursor-pointer"
      >
        {copied ? '✓ Copiado!' : 'Copiar'}
      </button>
    </div>
  )
}
