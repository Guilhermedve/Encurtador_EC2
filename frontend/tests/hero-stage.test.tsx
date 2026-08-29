import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { AsciiScissorsHero } from '../src/components/ascii-scissors/AsciiScissorsHero'
import { HeroStage } from '../src/components/HeroStage'

describe('detached hero stage', () => {
  test('anchors content left and the independent visual right on desktop', () => {
    const markup = renderToStaticMarkup(
      <HeroStage
        content={<div>FORM CONTENT</div>}
        visual={<div>SCISSORS VISUAL</div>}
      />,
    )

    expect(markup.indexOf('FORM CONTENT')).toBeLessThan(
      markup.indexOf('SCISSORS VISUAL'),
    )
    expect(markup).toContain('data-hero-content="left"')
    expect(markup).toContain('lg:absolute lg:inset-y-0 lg:left-0')
    expect(markup).toContain('lg:w-[46vw]')
    expect(markup).toContain('data-hero-visual="right"')
    expect(markup).toContain('lg:absolute lg:inset-y-0 lg:right-0')
    expect(markup).toContain('lg:w-[52vw]')
    expect(markup).not.toContain('mx-auto grid')
  })

  test('gives the scissors the full detached visual region', () => {
    const markup = renderToStaticMarkup(
      <AsciiScissorsHero
        cutRequestId={0}
        cutting={false}
        onCutComplete={() => undefined}
      />,
    )

    expect(markup).toContain('h-full')
    expect(markup).toContain('min-h-[420px]')
    expect(markup).toContain('lg:min-h-[560px]')
    expect(markup).toContain('w-full')
    expect(markup).not.toContain('h-[38svh]')
    expect(markup).not.toContain('md:h-[min(70vh,720px)]')
  })
})
