export type StackGroup = Readonly<{
  label: 'INTERFACE' | 'API' | 'DADOS' | 'INFRA'
  technologies: readonly string[]
}>

export const LINKEDIN_URL = 'https://www.linkedin.com/in/guilhermecostadve/'

export const PROJECT_STACK: readonly StackGroup[] = [
  {
    label: 'INTERFACE',
    technologies: [
      'REACT 19',
      'TYPESCRIPT 5.7',
      'VITE 6',
      'TAILWIND CSS 4',
      'THREE.JS',
      'REACT THREE FIBER',
      'DREI / ASCII RENDERER',
    ],
  },
  {
    label: 'API',
    technologies: ['BUN', 'ELYSIA', 'TYPESCRIPT'],
  },
  {
    label: 'DADOS',
    technologies: ['AZURE TABLE STORAGE', 'MEMORY REPOSITORY (DEV)'],
  },
  {
    label: 'INFRA',
    technologies: [
      'AZURE STATIC WEB APPS',
      'AZURE CONTAINER APPS',
      'DOCKER / GHCR',
      'GITHUB ACTIONS',
    ],
  },
]
