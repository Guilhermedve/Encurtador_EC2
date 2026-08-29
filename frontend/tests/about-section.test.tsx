import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { AboutSection } from '../src/components/AboutSection'
import { Header } from '../src/components/Header'
import { SiteFooter } from '../src/components/SiteFooter'

describe('recruiter-facing project section', () => {
  test('renders the project objective, architecture, ci/cd pipeline, and decisions', () => {
    const markup = renderToStaticMarkup(
      <>
        <Header />
        <AboutSection />
      </>,
    )

    expect(markup).toContain('href="#sobre"')
    expect(markup).toContain('id="sobre"')
    expect(markup).toContain('[ SOBRE O PROJETO ]')

    expect(markup).toContain('OBJETIVO')
    expect(markup).toContain(
      'Encurtador de URLs desenvolvido para explorar uma arquitetura full stack distribuída na Azure.',
    )

    expect(markup).toContain('ARQUITETURA')
    expect(markup).toContain('Browser')
    expect(markup).toContain('Azure Static Web Apps')
    expect(markup).toContain('React + TypeScript')
    expect(markup).toContain('API')
    expect(markup).toContain('Azure Container Apps')
    expect(markup).toContain('Azure Table Storage')

    expect(markup).toContain('CI/CD')
    expect(markup).toContain('GitHub → GitHub Actions → GHCR → Azure')

    expect(markup).toContain('DECISÕES')
    expect(markup).toContain('Frontend e API implantados separadamente')
    expect(markup).toContain('API containerizada com Docker')
    expect(markup).toContain('Persistência gerenciada na Azure')
    expect(markup).toContain('Pipeline automatizado de build e deploy')
  })

  test('renders safe external LinkedIn and GitHub repository links', () => {
    const markup = renderToStaticMarkup(
      <>
        <AboutSection />
        <SiteFooter />
      </>,
    )
    const linkedinUrl = 'https://www.linkedin.com/in/guilhermecostadve/'
    const repoUrl = 'https://github.com/Guilhermedve/Encurtador_EC2'

    expect(markup.split(`href="${linkedinUrl}"`)).toHaveLength(3)
    expect(markup.split(`href="${repoUrl}"`)).toHaveLength(2)
    expect(markup.split('target="_blank"')).toHaveLength(4)
    expect(markup.split('rel="noreferrer"')).toHaveLength(4)
  })
})
