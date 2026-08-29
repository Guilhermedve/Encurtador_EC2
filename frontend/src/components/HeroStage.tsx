import type { ReactNode } from 'react'

type HeroStageProps = {
  content: ReactNode
  visual: ReactNode
}

export function HeroStage({ content, visual }: HeroStageProps) {
  return (
    <div className="relative z-10 min-h-[calc(100svh-56px)] py-10 lg:py-0">
      <div
        data-hero-content="left"
        className="relative z-20 w-full px-5 sm:px-6 lg:absolute lg:inset-y-0 lg:left-0 lg:flex lg:w-[46vw] lg:items-center lg:pl-6 lg:pr-0 xl:pl-8"
      >
        {content}
      </div>

      <div
        data-hero-visual="right"
        className="relative z-10 mt-10 h-[460px] w-full lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:h-auto lg:w-[52vw]"
      >
        {visual}
      </div>
    </div>
  )
}
