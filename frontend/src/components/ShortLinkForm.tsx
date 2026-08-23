import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createShortLink } from '../services/api'

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' && url.hostname.length > 0
  } catch {
    return false
  }
}

export function ShortLinkForm() {
  const [url, setUrl] = useState('')
  const [shortUrl, setShortUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')
  const [validationError, setValidationError] = useState(false)
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearCopiedTimeout() {
    if (copiedTimeoutRef.current !== null) {
      clearTimeout(copiedTimeoutRef.current)
      copiedTimeoutRef.current = null
    }
  }

  useEffect(() => {
    return () => clearCopiedTimeout()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setShortUrl('')
    clearCopiedTimeout()
    setCopied(false)
    setCopyError('')
    setValidationError(false)

    if (!isHttpsUrl(url)) {
      setValidationError(true)
      setError('Informe uma URL HTTPS válida (iniciando com https://).')
      return
    }

    setLoading(true)

    try {
      const result = await createShortLink(url)
      setShortUrl(result.shortUrl)
    } catch {
      setError('Não foi possível encurtar o link. Verifique o backend ou tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!shortUrl) return
    clearCopiedTimeout()
    setCopied(false)
    setCopyError('')

    try {
      await navigator.clipboard.writeText(shortUrl)
      setCopied(true)
      clearCopiedTimeout()
      copiedTimeoutRef.current = setTimeout(() => {
        setCopied(false)
        copiedTimeoutRef.current = null
      }, 2000)
    } catch {
      setCopied(false)
      setCopyError('Não foi possível copiar o link. Copie manualmente.')
    }
  }

  return (
    <div className="shortener-card">
      <div className="card-header-bar">
        <span>INPUT / HTTPS URL</span>
        <span>V1.0</span>
      </div>

      <div className="card-body">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="url">URL de destino</label>
            <div className="input-container">
              <input
                id="url"
                className="shortener-input"
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://sua-url-longa.com/exemplo"
                pattern="https://.*"
                required
                autoComplete="off"
                spellCheck="false"
                aria-describedby={error ? 'url-error' : undefined}
                aria-invalid={validationError || undefined}
              />
              <button className="shortener-button" type="submit" disabled={loading}>
                {loading ? 'ENVIANDO...' : 'ENCURTAR'} <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="alert-error" id="url-error" role="alert">
              <span aria-hidden="true">ERRO / </span>{error}
            </div>
          )}

          {shortUrl && (
            <div className="result-box" role="status" aria-live="polite">
              <div className="result-label">LINK GERADO</div>
              <div className="result-row">
                <a className="result-link" href={shortUrl} target="_blank" rel="noreferrer">
                  {shortUrl}
                </a>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`copy-btn ${copied ? 'copied' : ''}`}
                >
                  {copied ? 'COPIADO ✓' : 'COPIAR'}
                </button>
              </div>
              {copyError && (
                <div className="copy-alert" role="alert">
                  {copyError}
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
