# Azure Static Web Apps, Container Apps e Table Storage — Design

**Status:** aprovado pelo usuário em 2026-08-28

**Branch de planejamento:** `deploy/swa-container-apps`

**Base:** `origin/main` em `4a8b63a72e18163553f1993d986343c4251bb3cd`

## Objetivo

Reduzir o repositório ao código e à configuração necessários para operar o
encurtador com:

- frontend React/Vite no Azure Static Web Apps;
- backend Bun/Elysia no Azure Container Apps;
- links persistidos no Azure Table Storage;
- um único workflow do GitHub Actions para validação e publicação;
- nenhuma infraestrutura antiga de EC2, Azure VM, Terraform, Compose ou
  contêiner de frontend.

O resultado deve continuar sendo um encurtador funcional. Publicar apenas a
página estática sem API não satisfaz este design.

## Fora de escopo

- domínio personalizado;
- múltiplos ambientes de produção;
- autenticação de usuários;
- painel administrativo ou estatísticas de cliques;
- migração de dados, pois o repositório atual usa memória volátil;
- alta escala com várias réplicas do backend;
- infraestrutura como código;
- alteração visual do frontend;
- publicação, merge ou push durante a fase de planejamento.

## Estado atual confirmado

- O repositório é público e contém workspaces `frontend/` e `backend/`.
- O frontend usa React, TypeScript e Vite.
- O backend usa Bun, TypeScript e Elysia.
- O backend já possui um Dockerfile funcional e testes automatizados.
- O repositório atual armazena links e limites de requisição em memória.
- A `origin/main` contém dois workflows do Azure Static Web Apps, um workflow
  de imagens Docker e um workflow de Terraform.
- O workflow `white-tree` chegou a registrar uma publicação bem-sucedida, mas
  o endereço retornado passou a responder `404`.
- O workflow `red-sky` falha por recurso/token do Static Web Apps inválido ou
  incompatível.
- O frontend usa `http://localhost:3000` quando `VITE_API_URL` não é fornecida.
- O GitHub CLI local está autenticado, mas o token não possui `read:packages`.
- Azure CLI e Bun não estão instalados na máquina local atual.

## Arquitetura de produção

```text
Navegador
  |
  +--> Azure Static Web Apps
  |      frontend React/Vite
  |      VITE_API_URL = URL pública do Container App
  |
  +--> Azure Container Apps
         backend Bun/Elysia
         escala mínima 0, máxima 1
         identidade gerenciada do sistema
         |
         +--> Azure Table Storage
                tabela links
                autenticação por RBAC
```

O frontend chama diretamente a URL HTTPS pública do Container App. O backend
aceita a origem exata do Static Web App por CORS. Os links curtos usam a URL
pública do backend, portanto o redirecionamento continua funcionando mesmo
quando o frontend não está aberto.

O Container App usa uma réplica no máximo. Essa restrição mantém o rate limiter
em memória semanticamente consistente. A persistência de links não depende da
vida da réplica.

## Fluxos de aplicação

### Criar um link

1. O navegador envia `POST /api/links` ao Container App.
2. O backend normaliza e valida a URL HTTPS.
3. O repositório procura o índice derivado da URL normalizada.
4. Se a URL já existe, o backend retorna `200` com o mesmo código.
5. Se não existe, o serviço gera um código de nove caracteres.
6. O repositório tenta gravar atomicamente o link e seu índice de URL.
7. Uma criação nova retorna `201`.
8. Uma colisão de código faz o serviço gerar outro código, com o limite atual
   de dez tentativas.

### Redirecionar

1. O navegador solicita `GET /:code` no Container App.
2. O backend consulta diretamente a entidade indexada pelo código.
3. Código conhecido retorna redirecionamento `302` para a URL original.
4. Código ausente retorna `404`.
5. Falha de acesso ao Storage retorna `503`, nunca `404`.

## Modelo de dados no Table Storage

Será usada uma tabela chamada `links` e uma partição lógica constante chamada
`links`. Cada URL cria duas entidades na mesma partição:

### Entidade por código

- `PartitionKey`: `links`
- `RowKey`: `code:<codigo>`
- `kind`: `code`
- `code`: código de nove caracteres
- `originalUrl`: URL HTTPS normalizada

### Entidade por URL

- `PartitionKey`: `links`
- `RowKey`: `url:<sha256-da-url-normalizada>`
- `kind`: `url_index`
- `code`: código de nove caracteres
- `originalUrl`: URL HTTPS normalizada

As duas entidades são criadas em uma única Entity Group Transaction. Como
compartilham a mesma `PartitionKey`, a gravação é atômica. A transação contém
apenas duas entidades, abaixo do limite do serviço.

O valor `originalUrl` também fica no índice de URL para permitir a verificação
de integridade do hash. Se um índice apresentar a mesma SHA-256 para uma URL
diferente, o backend trata o estado como violação de integridade, registra um
evento sem expor as URLs e retorna `503`.

## Contrato do repositório

O contrato de leitura permanece conceitualmente igual:

- `findByOriginalUrl(originalUrl)` procura `url:<sha256>`;
- `findByCode(code)` procura `code:<code>`.

A gravação deixa de retornar apenas `StoredLink` e passa a expressar o
resultado concorrente:

```ts
type SaveLinkResult =
  | { status: 'created'; link: StoredLink }
  | { status: 'url_exists'; link: StoredLink }
  | { status: 'code_collision' }
```

O método correspondente será `saveIfAbsent(link): Promise<SaveLinkResult>`.
O `LinkService` usa esse resultado para definir o status HTTP e decidir se deve
repetir a geração de código.

### Concorrência

Se duas requisições tentarem criar a mesma URL simultaneamente:

1. as duas podem observar inicialmente que o índice não existe;
2. apenas uma transação cria o `url:<sha256>`;
3. a transação perdedora relê o índice;
4. se a URL encontrada é a mesma, retorna `url_exists`;
5. se apenas o código está ocupado e o índice da URL continua ausente, retorna
   `code_collision`;
6. nenhuma colisão esperada é convertida em erro `500`.

## Seleção e autenticação do repositório

Variáveis do backend:

- `LINK_REPOSITORY=azure-table` em produção;
- `AZURE_STORAGE_ACCOUNT_URL=https://<conta>.table.core.windows.net`;
- `AZURE_STORAGE_TABLE_NAME=links`;
- `FRONTEND_URL` com a origem exata do Static Web App;
- `PUBLIC_BASE_URL` com a origem exata do Container App;
- `TRUST_PROXY=true` atrás do ingress controlado do Container Apps;
- variáveis de rate limiting já existentes.

Em produção, o cliente usa `ManagedIdentityCredential`. A identidade gerenciada
do Container App recebe o papel `Storage Table Data Contributor` com escopo
restrito à tabela `links`. Chaves de conta e connection strings não entram no
Container App nem no GitHub.

Em testes e desenvolvimento, o código aceita explicitamente:

- `LINK_REPOSITORY=memory` para testes de serviço que não exercitam Azure;
- uma connection string de Azurite somente para testes de integração locais e
  no CI.

A tabela é criada na configuração inicial do ambiente. O papel integrado
`Storage Table Data Contributor` também contém permissões de criar e apagar
tabelas; o escopo na tabela `links` impede acesso às demais tabelas, mas ainda
permite apagar a própria `links`. A aplicação não chama essas operações. Exigir
bloqueio técnico da exclusão da tabela demandaria um papel RBAC personalizado,
que fica fora deste escopo mínimo.

## Tratamento de erros

| Condição | Resposta |
| --- | --- |
| URL inválida ou payload inválido | `422` |
| Rate limit excedido | `429` |
| Código não encontrado | `404` |
| Dez colisões consecutivas de código | `503` |
| Storage indisponível, timeout ou RBAC inválido | `503` |
| Violação de integridade do índice de URL | `503` |
| Erro não classificado | `500` |

Logs podem incluir nome da operação, categoria do erro, request ID do Azure e
código HTTP. Logs não podem incluir connection strings, tokens ou a URL
completa fornecida pelo usuário.

## Workflow único

Os quatro workflows atuais serão substituídos por
`.github/workflows/deploy.yml`.

### Eventos

- `pull_request` para `main`: somente validação;
- `push` para `main`: validação e publicação;
- `workflow_dispatch`: publicação manual controlada.

### Jobs

1. `validate`
   - checkout;
   - setup do Bun;
   - instalação com lockfile congelado;
   - testes unitários;
   - Azurite para os testes do repositório;
   - build do frontend com uma URL de API não local;
   - inspeção do bundle para impedir `localhost`;
   - build e smoke test da imagem do backend.
2. `publish_backend_image`
   - executado somente fora de pull requests;
   - publica `ghcr.io/guilhermedve/encurtador_ec2-backend:sha-<sha-curto>`;
   - usa `packages: write` somente neste job;
   - não publica mais imagem do frontend.
3. `deploy_backend`
   - depende da imagem publicada;
   - usa `id-token: write` e `azure/login` com OIDC;
   - atualiza o Container App para a tag imutável do commit;
   - não grava credenciais Azure permanentes.
4. `deploy_frontend`
   - depende do backend publicado;
   - fornece `VITE_API_URL` durante o build;
   - usa `Azure/static-web-apps-deploy` com `app_location=frontend`,
     `api_location` vazio e `output_location=dist`;
   - não tenta empacotar `backend/` como Azure Functions.
5. `smoke`
   - confirma HTTP `200` no frontend e em `/health`;
   - cria uma URL HTTPS fixa e idempotente;
   - repete a criação e verifica o mesmo código;
   - confirma o redirecionamento `302`.

Uma falha em validação ou backend impede a publicação do frontend. Tags de
imagem baseadas no SHA tornam a revisão implantada rastreável e evitam depender
de `latest`.

## Configuração do GitHub

### Secrets

- `AZURE_STATIC_WEB_APPS_API_TOKEN`
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

Os três identificadores usados pelo login OIDC ficam em GitHub Secrets por
recomendação do provedor, mesmo não sendo senhas. O federated credential aceita
somente este repositório e a branch `main`.

### Variables

- `AZURE_RESOURCE_GROUP`
- `AZURE_CONTAINER_APP_NAME`
- `BACKEND_PUBLIC_URL`
- `FRONTEND_PUBLIC_URL`
- `GHCR_BACKEND_IMAGE`

A imagem GHCR do backend precisa estar pública. A visibilidade atual não foi
confirmada porque o token local não possui `read:packages`; essa verificação é
uma etapa obrigatória antes do primeiro deploy.

## Recursos Azure criados uma vez

Como o usuário solicitou remover a infraestrutura antiga, o repositório não
manterá Terraform, Bicep ou ARM. A configuração inicial será documentada no
`README.md` e executada pelo Portal Azure ou Azure Cloud Shell:

1. um Resource Group;
2. um Storage Account Standard LRS;
3. a tabela `links`;
4. um Container Apps Environment no plano Consumption;
5. um Container App com ingress HTTPS externo, porta 3000 e escala `0–1`;
6. identidade gerenciada do sistema no Container App;
7. papel `Storage Table Data Contributor` para essa identidade, atribuído no
   escopo específico da tabela `links`;
8. um Azure Static Web App;
9. identidade OIDC do GitHub com permissão mínima para atualizar o Container
   App;
10. secrets e variables do GitHub definidos acima.

Nenhum `apply`, criação de recurso ou mudança de custo acontece durante a fase
de planejamento.

## Limpeza do repositório

### Manter

- `.dockerignore` para a imagem do backend;
- `.gitignore`;
- `backend/`, incluindo Dockerfile e testes;
- `frontend/`, exceto os artefatos específicos de Nginx/Docker;
- `package.json` e `bun.lock`;
- `README.md`, reescrito para a arquitetura atual;
- esta especificação;
- um único workflow `deploy.yml`.

### Remover durante a implementação

- `.github/workflows/azure-static-web-apps-red-sky-09ba48410.yml`;
- `.github/workflows/azure-static-web-apps-white-tree-00b96a210.yml`;
- `.github/workflows/docker-publish.yml`;
- `.github/workflows/terraform-validate.yml`;
- `deploy/azure-vm/`;
- `infra/terraform/`;
- `docker-compose.yml`;
- `frontend/Dockerfile`;
- `frontend/nginx.conf`;
- `frontend/tsconfig.app.tsbuildinfo`;
- `frontend/tsconfig.node.tsbuildinfo`;
- `docs/superpowers/specs/2026-08-27-frontend-encurtador-design.md`;
- `docs/superpowers/specs/2026-08-27-hero-title-blur-panel-design.md`.

Arquivos de código do frontend e backend não podem ser classificados como lixo
apenas por não serem referenciados textualmente. Build, configuração e testes
devem confirmar qualquer remoção adicional.

## Estratégia de testes

### Unidade

- serialização das entidades de código e URL;
- hash determinístico da URL normalizada;
- leitura por código e URL;
- `created`, `url_exists` e `code_collision`;
- mapeamento de falhas do SDK para indisponibilidade;
- comportamento do `LinkService` para os três resultados de gravação.

### Integração com Azurite

- criação atômica das duas entidades;
- repetição idempotente da mesma URL;
- duas criações concorrentes da mesma URL;
- colisão de código;
- redirecionamento após reconstruir a instância do repositório;
- confirmação de que falha de Storage não vira `404`.

### Contêiner

- build usando `backend/Dockerfile`;
- execução como usuário não root;
- `/health` disponível na porta 3000;
- uso do SDK Azure dentro do runtime Bun validado contra Azurite.

### Frontend

- TypeScript e Vite buildam com `VITE_API_URL` fornecida;
- o bundle final não contém `localhost:3000`;
- criação, estado de carregamento, sucesso e erro continuam funcionando.

### Pós-deploy

- frontend responde `200`;
- backend `/health` responde `200`;
- criação inicial responde `201`;
- repetição responde `200` com o mesmo código;
- redirecionamento responde `302`;
- o link continua funcionando após reinício ou nova revisão do Container App.

## Critérios de aceite

- Existe somente `.github/workflows/deploy.yml` em produção.
- Todos os caminhos listados para remoção estão ausentes.
- Testes, frontend build, backend image build e integração com Azurite passam.
- O bundle publicado não contém referências a localhost.
- Frontend e backend estão publicamente acessíveis por HTTPS.
- Criação, deduplicação, colisão e redirecionamento seguem os status definidos.
- Um link sobrevive a reinício ou substituição da réplica.
- O Container App acessa a tabela por identidade gerenciada.
- Nenhuma chave, token ou connection string está versionada.
- O workflow usa OIDC e permissões mínimas por job.
- O estado do Git fica limpo depois dos commits de implementação.

## Premissas

- O usuário controla a assinatura Azure e as configurações do repositório
  GitHub.
- O repositório e a imagem do backend podem permanecer públicos.
- Pequenos custos de Container Apps, Storage e logs são aceitáveis.
- Cold start é aceitável.
- Uma réplica e uma partição atendem ao volume esperado.
- O endereço fornecido pelo Azure é suficiente nesta fase.

## Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| SDK Azure incompatível com Bun | teste de integração dentro da imagem antes de qualquer deploy |
| Static Web App atual removido ou desconectado | recriar ou reconectar o recurso e substituir o token único |
| GHCR privado impedir o pull | confirmar e tornar o pacote público antes do primeiro deploy |
| Cold start aumentar latência | aceitar inicialmente; elevar `minReplicas` apenas com evidência |
| Rate limiter divergir entre réplicas | limitar `maxReplicas` a 1 |
| Partição única limitar throughput | manter para o escopo atual e redesenhar somente com métricas |
| RBAC incorreto causar falhas | teste pós-deploy e retorno explícito `503` |
| Papel integrado permitir apagar a tabela `links` | restringir o escopo à tabela e não expor operação de administração no código |
| URL errada compilada no frontend | variável obrigatória e busca por `localhost` no bundle |
| Workflow único acoplar falhas | jobs separados e dependências explícitas |
| Mudança gerar custo inesperado | revisar recursos no Portal antes da criação inicial |

## Ferramentas e dependências

- Git e GitHub CLI para inspeção e configuração do repositório;
- GitHub Actions;
- `oven-sh/setup-bun`;
- Docker Buildx;
- GHCR;
- `Azure/static-web-apps-deploy`;
- `azure/login` com OIDC;
- `azure/container-apps-deploy-action`;
- `@azure/data-tables`;
- `@azure/identity`;
- Azurite;
- Portal Azure ou Azure Cloud Shell para o bootstrap único.

Azure CLI e Bun locais não são assumidos como disponíveis. Validação local que
dependa deles só pode ser declarada depois de instalá-los ou executá-la no CI.

## Limite entre planejamento e implementação

Esta especificação é um artefato de planejamento. As ações seguintes são
trabalho novo e precisam ser executadas por um agente implementador:

- adicionar o repositório Azure Table;
- alterar o contrato de gravação e o `LinkService`;
- adicionar dependências e testes;
- substituir workflows;
- remover infraestrutura e documentos obsoletos;
- reescrever o README;
- configurar ou publicar recursos externos.

O agente planejador só pode corrigir diretamente um bug concreto, reproduzível
e introduzido no código que ele estiver supervisionando. Essa exceção não
autoriza implementar as mudanças descritas acima.
