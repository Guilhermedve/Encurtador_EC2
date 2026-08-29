import { useCallback, useEffect, useState } from 'react'
import { AboutSection } from '../components/AboutSection'
import { AsciiFlowTrail } from '../components/ascii-flow-trail/AsciiFlowTrail'
import { AsciiScissorsHero } from '../components/ascii-scissors/AsciiScissorsHero'
import { BottomBlur } from '../components/BottomBlur'
import { DitheringOverlay } from '../components/DitheringOverlay'
import { Header } from '../components/Header'
import { HeroStage } from '../components/HeroStage'
import { SiteFooter } from '../components/SiteFooter'
import { UrlShortenerCard } from '../components/UrlShortenerCard'
import { CUT_TIMING } from '../components/ascii-scissors/cutAnimation'

type CutState = {
  requestId: number
  cutting: boolean
}

export function startCut(state: CutState): CutState {
  return { requestId: state.requestId + 1, cutting: true }
}

export function completeCut(state: CutState, requestId: number): CutState {
  return state.requestId === requestId ? { ...state, cutting: false } : state
}

export function HomePage() {
  const [cutState, setCutState] = useState<CutState>({
    requestId: 0,
    cutting: false,
  })

  const handleShortenSuccess = useCallback(() => {
    setCutState(startCut)
  }, [])

  const handleCutComplete = useCallback((requestId: number) => {
    setCutState((current) => completeCut(current, requestId))
  }, [])

  useEffect(() => {
    if (!cutState.cutting) return

    const timeoutId = window.setTimeout(() => {
      handleCutComplete(cutState.requestId)
    }, CUT_TIMING.watchdogMs)

    return () => window.clearTimeout(timeoutId)
  }, [cutState.cutting, cutState.requestId, handleCutComplete])

  return (
    <div className="relative min-h-screen bg-black text-white">
      <DitheringOverlay />
      <BottomBlur />
      <Header />

      <main className="relative isolate z-10 overflow-hidden pb-16">
        <AsciiFlowTrail />
        <HeroStage
          content={
            <div className="w-full max-w-[680px]">
              <div
                className="mb-8 rounded-lg border bg-[rgba(13,13,13,0.85)] px-6 py-8 text-left backdrop-blur-[12px] sm:mb-10 sm:px-8 sm:py-10"
                style={{ borderColor: 'rgba(255,255,255,0.12)' }}
              >
                <h1
                  className="font-black leading-[0.9] tracking-[-0.04em] text-white"
                  style={{
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontSize: 'clamp(2.75rem, 7vw, 5.5rem)',
                  }}
                >
                  ENCURTE.
                  <br />
                  COMPARTILHE.
                  <br />
                  DOMINE.
                </h1>
                <p className="mt-4 max-w-[36ch] text-base leading-relaxed text-white/60 sm:text-[1.05rem]">
                  Cole sua URL e gere um link curto instantaneamente. Simples, rápido e com estilo zine.
                </p>
              </div>

              <UrlShortenerCard
                cutting={cutState.cutting}
                onShortenSuccess={handleShortenSuccess}
              />
            </div>
          }
          visual={
            <AsciiScissorsHero
              cutRequestId={cutState.requestId}
              cutting={cutState.cutting}
              onCutComplete={handleCutComplete}
            />
          }
        />
      </main>

      <AboutSection />
      <SiteFooter />
    </div>
  )
}
