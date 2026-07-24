# Backend EC2 Compose

Este Compose executa somente o backend do encurtador, Caddy e Watchtower.

## Configuração

Copie `.env.example` para `.env` e substitua `DOMAIN_NAME`. O registro `A`
do Cloudflare deve ficar em DNS only e apontar para o Elastic IP.

## Operação

```sh
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 backend caddy watchtower
```

Somente Caddy publica 80/443. A porta 3000 é interna.

## Atualização

O workflow publica `backend:latest`. Watchtower verifica a imagem a cada
300 segundos e atualiza somente o backend marcado por label.

## Rollback

Edite `BACKEND_IMAGE` no `.env` para uma tag `sha-<commit>` existente e rode:

```sh
docker compose pull backend
docker compose up -d backend
docker compose ps
```

Confirme `https://SEU_DOMINIO/health`. Não existe rollback automático.
