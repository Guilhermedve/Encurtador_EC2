export const LINKEDIN_URL = 'https://www.linkedin.com/in/guilhermecostadve/'
export const REPOSITORY_URL = 'https://github.com/Guilhermedve/Encurtador_EC2'

export const PROJECT_OBJECTIVE =
  'Encurtador de URLs desenvolvido para explorar uma arquitetura full stack distribuída na Azure.'

export const PROJECT_ARCHITECTURE_ASCII = `Browser
   │
   ├── Azure Static Web Apps
   │      └── React + TypeScript
   │
   └── API
          └── Azure Container Apps
                  │
                  └── Azure Table Storage`

export const PROJECT_CICD_STEPS = [
  'GitHub',
  'GitHub Actions',
  'GHCR',
  'Azure',
] as const

export const PROJECT_CICD_PIPELINE = 'GitHub → GitHub Actions → GHCR → Azure'

export const PROJECT_DECISIONS = [
  'Frontend e API implantados separadamente',
  'API containerizada com Docker',
  'Persistência gerenciada na Azure',
  'Pipeline automatizado de build e deploy',
] as const
