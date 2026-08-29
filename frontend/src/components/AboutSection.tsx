import { LINKEDIN_URL, PROJECT_STACK } from '../content/projectStack'

export function AboutSection() {
  return (
    <section
      id="sobre"
      aria-labelledby="about-title"
      className="relative z-10 mx-auto min-h-screen w-full max-w-[1180px] scroll-mt-6 px-5 py-24 sm:px-8 sm:py-32"
    >
      <pre
        aria-hidden="true"
        className="mb-8 overflow-hidden text-xs font-bold tracking-tight text-white/55 sm:text-base"
      >
        [ URL_EXTENSA ] ----//----&gt; [ EC2.SH ]
      </pre>

      <h2
        id="about-title"
        className="max-w-[10ch] text-[clamp(3.5rem,12vw,9rem)] font-black leading-[0.82] tracking-[-0.065em]"
      >
        SOBRE O PROJETO
      </h2>

      <div className="mt-16 grid gap-4 md:grid-cols-2">
        {PROJECT_STACK.map((group) => (
          <article
            key={group.label}
            className="border border-white/20 bg-black/75 p-5 backdrop-blur-[12px] sm:p-6"
          >
            <h3 className="border-b border-white/20 pb-3 text-sm font-black tracking-[0.16em]">
              [ {group.label} ]
            </h3>
            <ul className="mt-4 space-y-2" aria-label={`Tecnologias de ${group.label.toLowerCase()}`}>
              {group.technologies.map((technology, index) => (
                <li key={technology} className="font-mono text-sm text-white/75 sm:text-base">
                  {index === group.technologies.length - 1 ? '└─' : '├─'} {technology}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <a
        href={LINKEDIN_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-10 inline-flex border border-white bg-white px-5 py-4 text-sm font-black tracking-[0.08em] text-black transition-colors hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        [ ACESSAR LINKEDIN ↗ ]
        <span className="sr-only"> (abre em nova aba)</span>
      </a>
    </section>
  )
}
