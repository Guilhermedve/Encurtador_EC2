import { HalftoneBackground } from '../components/HalftoneBackground'
import { DitheringOverlay } from '../components/DitheringOverlay'
import { Header } from '../components/Header'
import { UrlShortenerCard } from '../components/UrlShortenerCard'

export function HomePage() {
  return (
    <div className="relative min-h-screen bg-black text-white">
      <HalftoneBackground />
      <DitheringOverlay />

      <Header />

      <main className="relative z-10 flex min-h-[calc(100vh-56px)] flex-col items-center justify-center px-5 pb-16 sm:px-6">
        <div className="w-full max-w-[760px]">
          <div
            className="mb-8 rounded-lg border bg-[rgba(13,13,13,0.85)] px-6 py-8 text-center backdrop-blur-[12px] sm:mb-10 sm:px-8 sm:py-10"
            style={{ borderColor: 'rgba(255,255,255,0.12)' }}
          >
            <h1
              className="font-black leading-[0.9] tracking-[-0.04em] text-white"
              style={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontSize: 'clamp(2.75rem, 8vw, 5.5rem)',
              }}
            >
              ENCURTE.
              <br />
              COMPARTILHE.
              <br />
              DOMINE.
            </h1>
            <p className="mx-auto mt-4 max-w-[36ch] text-base leading-relaxed text-white/60 sm:text-[1.05rem]">
              Cole sua URL e gere um link curto instantaneamente. Simples, rápido e com estilo zine.
            </p>
          </div>

          <UrlShortenerCard />
        </div>
      </main>

      <footer className="relative z-10 flex h-10 items-center justify-center">
        <span className="text-xs font-medium tracking-wide text-white/40">
          © 2026 Encurtador EC2
        </span>
      </footer>
    </div>
  )
}
