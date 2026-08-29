# EncurtadorDeLinks

Encurtador de URLs full stack em um único repositório, publicado no Azure sem
servidor de orquestração próprio:

- **Front-end:** React, TypeScript e Vite, servido pelo **Azure Static Web Apps**
  (`frontend/`);
- **Back-end:** Bun, TypeScript e Elysia, publicado no **Azure Container Apps**
  (`backend/`);
- **Persistência:** **Azure Table Storage**, com uma partição lógica `links` e
  dois índices (`code` e `url_index`);
- **Comunicação:** o front-end chama diretamente a URL HTTPS pública do Container
  App. Não há gateway nem função intermediária.

O repositório e a imagem do back-end no GHCR podem permanecer públicos.

## Arquitetura

```
Navegador → Static Web Apps (front-end)
                 │  (chamada HTTPS direta)
                 ▼
            Container Apps (back-end Elysia)  →  Table Storage (partição "links")
```

O back-end seleciona o repositório em tempo de execução:

- `LINK_REPOSITORY=memory` fora de produção (desenvolvimento e testes);
- `LINK_REPOSITORY=azure-table` em produção, usando identidade gerenciada e a
  URL HTTPS da conta de armazenamento. A connection string só é aceita fora de
  produção, contra o Azurite.

## Pré-requisitos

- [Bun](https://bun.sh/docs/installation) `1.3.14`;
- [Docker](https://docs.docker.com/get-docker/) para o Azurite e para construir
  a imagem do back-end localmente;
- Git e acesso a um repositório GitHub com permissão de executar Actions.

## Instalação

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
bun install
```

## Desenvolvimento

Por padrão o back-end usa `LINK_REPOSITORY=memory` e não precisa de Azure.

Em dois terminais, na raiz do projeto:

```powershell
bun run dev:backend   # API em http://localhost:3000
bun run dev:frontend  # interface em http://localhost:5173
```

## Testes e build

```powershell
bun run test                # testes de unidade e integração do back-end
bun run test:azure          # persistência no Azurite (requer o container abaixo)
bun run typecheck:backend   # checagem de tipos do back-end
bun run build               # build de produção do front-end (exige VITE_API_URL)
```

### Testes de persistência com Azurite

O Azurite emula o Table Storage localmente. Os testes de integração recusam
executar a menos que a connection string aponte para `loopback` ou `azurite`,
portanto nunca apagam uma tabela real do Azure.

```powershell
docker run --detach --rm --name encurtador-azurite `
  --publish 127.0.0.1:10002:10002 `
  mcr.microsoft.com/azure-storage/azurite:3.37.0

$env:AZURE_STORAGE_CONNECTION_STRING="UseDevelopmentStorage=true"
bun run test:azure

docker rm -f encurtador-azurite   # limpeza: só o container nomeado acima
```

## Variáveis de ambiente do back-end

| Variável | Padrão | Finalidade |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` exige `LINK_REPOSITORY=azure-table` |
| `LINK_REPOSITORY` | `memory` | `memory` ou `azure-table` |
| `AZURE_STORAGE_ACCOUNT_URL` | — | URL HTTPS da conta (obrigatória com `azure-table` sem connection string) |
| `AZURE_STORAGE_TABLE_NAME` | `links` | Nome da tabela (regras de nomenclatura do Azure Table) |
| `AZURE_STORAGE_CONNECTION_STRING` | — | Somente para Azurite local/CI; rejeitada em produção |
| `PORT` | `3000` | Porta HTTP do Container App |
| `FRONTEND_URL` | `http://localhost:5173` | Origem CORS aceita |
| `PUBLIC_BASE_URL` | `http://localhost:${PORT}` | Origem usada para montar a URL curta |
| `RATE_LIMIT_MAX` | `10` | Máximo de tentativas por IP e janela |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Duração da janela fixa |
| `TRUST_PROXY` | `false` | Usa o primeiro IP de `X-Forwarded-For` |

## Variáveis de ambiente do front-end

| Variável | Padrão | Finalidade |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:3000` (dev) | URL HTTPS pública do Container App; obrigatória em build de produção |

O build de produção falha se `VITE_API_URL` estiver ausente ou não for uma URL
HTTPS pública (sem `localhost`, `127.0.0.1` ou `[::1]`).

## Rotas da API

| Método | Caminho | Finalidade | Status |
| ------ | ------------ | ---------------------------------- | ------ |
| `GET` | `/health` | Confirma que a API está disponível | `200` |
| `POST` | `/api/links` | Cria ou reutiliza um link curto | `201` criado, `200` reutilizado |
| `GET` | `/:code` | Redireciona para a URL original | `302` |

Outros status: `422` entrada inválida, `429` limite de requisições excedido,
`503` armazenamento indisponível ou falha de integridade.

## Rate limiting

O `POST /api/links` permite por padrão 10 tentativas por endereço IP em cada
janela fixa de 60 segundos. Respostas aceitas incluem `RateLimit-Limit`,
`RateLimit-Remaining` e `RateLimit-Reset`. Quando o limite é excedido, a API
retorna `429 Too Many Requests` e também informa `Retry-After`.

Ative `TRUST_PROXY=true` somente atrás de um proxy controlado que substitua o
cabeçalho recebido do cliente. Os contadores ficam em memória e **não são
compartilhados entre réplicas**; o Container App roda com `maxReplicas=1`.

## Bootstrap no Azure (Portal ou Cloud Shell)

> As etapas abaixo criam recursos **billable** na sua assinatura Azure. Executem
> cada etapa somente após aprovação explícita e revisão de custos. A infraestrutura
> como código ficou fora de escopo; use o Portal/Cloud Shell.

1. Resource Group e revisão de região;
2. Storage Account Standard LRS e tabela `links`;
3. Container Apps Environment (Consumption);
4. Container App público na porta `3000` com `minReplicas=0` e `maxReplicas=1`;
5. identidade atribuída ao sistema (system-assigned managed identity);
6. atribuição de `Storage Table Data Contributor` à identidade do Container App,
   com escopo restrito à tabela `links`;
7. variáveis de runtime: `NODE_ENV=production`, `LINK_REPOSITORY=azure-table`,
   URL da conta/da tabela, origem CORS exata, `PUBLIC_BASE_URL` público e
   `TRUST_PROXY` conforme proxy;
8. Static Web App **sem** workflow duplicado gerado;
9. credencial federada OIDC do GitHub restrita a
   `repo:Guilhermedve/Encurtador_EC2:ref:refs/heads/main`;
10. secrets/variables do GitHub nomeados abaixo e verificação de que a imagem do
    GHCR é publicamente legível (pull anônimo) antes do deploy do Container Apps.

### Secrets e variables do GitHub

Secrets (4): `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`,
`AZURE_STATIC_WEB_APPS_API_TOKEN`.

Variables (6): `AZURE_RESOURCE_GROUP`, `AZURE_CONTAINER_APP_NAME`,
`AZURE_STORAGE_ACCOUNT_URL` (URL HTTPS da conta Table Storage),
`BACKEND_PUBLIC_URL` (HTTPS do Container App), `FRONTEND_PUBLIC_URL` (HTTPS do
Static Web App) e `GHCR_BACKEND_IMAGE` (caminho completo da imagem, ex.:
`ghcr.io/guilhermedve/encurtador_ec2-backend`).

## Deploy

O workflow `.github/workflows/deploy.yml` executa, em ordem, os jobs
`validate`, `publish_backend_image`, `deploy_backend`, `deploy_frontend` e
`smoke`. Os jobs de publicação/implantação/smoke exigem `github.ref ==
refs/heads/main` e evento que não seja PR.

Runbook de implantação:

1. Validar a branch (`deploy/swa-container-apps`) e revisar o diff;
2. Confirmar os recursos Azure e os secrets/variables;
3. Autorizar o push para `main`;
4. Acompanhar os cinco jobs no Actions;
5. Executar os smoke checks (saúde, criação, reuso e redirecionamento).

## Rollback

1. Reimplante a imagem do back-end `sha-<curto>` conhecida e imutável;
2. Reimplante o commit do front-end correspondente;
3. Nunca apague o Storage Account ou a tabela `links` como passo de rollback — o
   estado dos links persiste no Table Storage.
