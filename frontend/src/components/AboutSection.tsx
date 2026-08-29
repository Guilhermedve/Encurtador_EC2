import {
  LINKEDIN_URL,
  PROJECT_ARCHITECTURE_ASCII,
  PROJECT_CICD_PIPELINE,
  PROJECT_DECISIONS,
  PROJECT_OBJECTIVE,
  REPOSITORY_URL,
} from '../content/projectStack'

export function AboutSection() {
  return (
    <section
      id="sobre"
      aria-labelledby="about-title"
      className="relative z-10 mx-auto min-h-screen w-full max-w-[1180px] scroll-mt-6 px-5 py-24 sm:px-8 sm:py-32"
    >
      <h2
        id="about-title"
        className="max-w-[16ch] text-5xl leading-none font-black tracking-normal text-white sm:text-7xl lg:text-8xl"
      >
        [ SOBRE O PROJETO ]
      </h2>

      <div className="mt-12 grid gap-px border border-white/20 bg-white/20 lg:grid-cols-[0.78fr_1.22fr]">
        <article className="bg-black/80 p-6 backdrop-blur-[14px] sm:p-8">
          <h3 className="text-sm font-black tracking-normal text-white">OBJETIVO</h3>
          <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-white/82 sm:text-lg">
            {PROJECT_OBJECTIVE}
          </p>
        </article>

        <article className="bg-black/80 p-6 backdrop-blur-[14px] sm:p-8 lg:row-span-2">
          <h3 className="text-sm font-black tracking-normal text-white">ARQUITETURA</h3>
          <pre
            aria-label="Arquitetura de implantação"
            className="mt-5 overflow-x-auto font-mono text-xs leading-relaxed text-white/82 sm:text-sm md:text-base"
          >
            {PROJECT_ARCHITECTURE_ASCII}
          </pre>
        </article>

        <article className="bg-black/80 p-6 backdrop-blur-[14px] sm:p-8">
          <h3 className="text-sm font-black tracking-normal text-white">CI/CD</h3>
          <p className="mt-5 overflow-x-auto whitespace-nowrap font-mono text-sm text-white/82 sm:text-base">
            {PROJECT_CICD_PIPELINE}
          </p>
        </article>

        <article className="bg-black/80 p-6 backdrop-blur-[14px] sm:p-8 lg:col-span-2">
          <h3 className="text-sm font-black tracking-normal text-white">DECISÕES</h3>
          <ul
            aria-label="Decisões de arquitetura"
            className="mt-5 space-y-2 font-mono text-sm text-white/82 sm:text-base"
          >
            {PROJECT_DECISIONS.map((decision, index) => (
              <li key={decision}>
                <span aria-hidden="true" className="text-white/45">
                  {index === PROJECT_DECISIONS.length - 1 ? '└─' : '├─'}
                </span>{' '}
                {decision}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex border border-white bg-white px-5 py-4 text-sm font-black tracking-normal text-black transition-colors hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          [ LINKEDIN ↗ ]
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
        <a
          href={REPOSITORY_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex border border-white/35 bg-black/80 px-5 py-4 text-sm font-black tracking-normal text-white backdrop-blur-[14px] transition-colors hover:border-white hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          [ GITHUB ↗ ]
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      </div>
    </section>
  )
}
