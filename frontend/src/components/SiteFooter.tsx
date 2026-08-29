import { LINKEDIN_URL } from '../content/projectStack'

export function SiteFooter() {
  return (
    <footer className="relative z-30 mx-auto flex min-h-20 w-full max-w-[1180px] items-center justify-between gap-4 px-5 py-6 text-xs font-black tracking-[0.12em] text-white/65 sm:px-8">
      <span>EC2.SH / 2026</span>
      <a
        href={LINKEDIN_URL}
        target="_blank"
        rel="noreferrer"
        className="underline decoration-white/30 underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        LINKEDIN ↗<span className="sr-only"> (abre em nova aba)</span>
      </a>
    </footer>
  )
}
