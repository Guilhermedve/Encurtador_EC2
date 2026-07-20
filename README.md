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
