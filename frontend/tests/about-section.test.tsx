import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { AboutSection } from '../src/components/AboutSection'
import { Header } from '../src/components/Header'
import { SiteFooter } from '../src/components/SiteFooter'

describe('recruiter-facing project section', () => {
  test('renders the factual stack and same-page navigation', () => {
    const markup = renderToStaticMarkup(
      <>
        <Header />
        <AboutSection />
        <SiteFooter />
      </>,
    )

    expect(markup).toContain('href="#sobre"')
    expect(markup).toContain('id="sobre"')
    expect(markup).toContain('SOBRE O PROJETO')
    expect(markup).toContain('[ URL_EXTENSA ] ----//----&gt; [ EC2.SH ]')

    for (const label of ['INTERFACE', 'API', 'DADOS', 'INFRA']) {
      expect(markup).toContain(label)
    }

    for (const technology of [
      'REACT 19',
      'TYPESCRIPT 5.7',
      'VITE 6',
      'TAILWIND CSS 4',
      'P5.JS / CANVAS',
      'BUN',
      'ELYSIA',
      'AZURE TABLE STORAGE',
      'MEMORY REPOSITORY (DEV)',
      'AZURE STATIC WEB APPS',
      'AZURE CONTAINER APPS',
      'DOCKER / GHCR',
      'GITHUB ACTIONS',
    ]) {
      expect(markup).toContain(technology)
    }

    expect(markup).not.toContain('THREE.JS')
  })

  test('renders two safe external LinkedIn links', () => {
    const markup = renderToStaticMarkup(
      <>
        <AboutSection />
        <SiteFooter />
      </>,
    )
    const linkedinUrl = 'https://www.linkedin.com/in/guilhermecostadve/'

    expect(markup.split(`href="${linkedinUrl}"`)).toHaveLength(3)
    expect(markup.split('target="_blank"')).toHaveLength(3)
    expect(markup.split('rel="noreferrer"')).toHaveLength(3)
    expect(markup).toContain('abre em nova aba')
  })
})
