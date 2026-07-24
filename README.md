# EncurtadorDeLinks

Refatoração do meu encurtador de links feito em java -> node/ts.

Aplicação full stack em um único repositório:

- **Back-end:** Bun, TypeScript e Elysia (`backend/`);
- **Front-end:** React, TypeScript e Vite (`frontend/`);
- **Persistência:** em memória (os links são perdidos ao reiniciar a API).

Consulte [`SETUP_INICIAL.md`](./SETUP_INICIAL.md) para o guia completo.

## Pré-requisitos

- [Bun](https://bun.sh/docs/installation) instalado;
- Git.

## Instalação

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
bun install
```

## Desenvolvimento

Em dois terminais, na raiz do projeto:

```powershell
bun run dev:backend   # API em http://localhost:3000
bun run dev:frontend  # interface em http://localhost:5173
```

## Testes e build

```powershell
bun run test
bun run build
```

## Rotas da API

| Método | Caminho      | Finalidade                         |
| ------ | ------------ | ---------------------------------- |
| `GET`  | `/health`    | Confirma que a API está disponível |
| `POST` | `/api/links` | Cria um link curto em memória      |
| `GET`  | `/:code`     | Redireciona para a URL original    |

## Rate limiting

O `POST /api/links` permite por padrão 10 tentativas por endereço IP em cada
janela fixa de 60 segundos. Respostas aceitas incluem `RateLimit-Limit`,
`RateLimit-Remaining` e `RateLimit-Reset`. Quando o limite é excedido, a API
retorna `429 Too Many Requests` e também informa `Retry-After`.

Configuração do backend:

| Variável | Padrão | Finalidade |
| --- | --- | --- |
| `RATE_LIMIT_MAX` | `10` | Máximo de tentativas por IP e janela |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Duração da janela fixa |
| `TRUST_PROXY` | `false` | Permite usar o primeiro IP de `X-Forwarded-For` |

Ative `TRUST_PROXY=true` somente atrás de um proxy controlado que substitua o
cabeçalho recebido do cliente. Os contadores ficam em memória e não são
compartilhados entre processos ou réplicas; esta implementação pressupõe uma
única instância do backend.
