# Kubernetes

Este diretório implanta duas imagens do GitHub Container Registry (GHCR):

- `ghcr.io/guilhermedve/encurtador_ec2-backend`
- `ghcr.io/guilhermedve/encurtador_ec2-frontend`

O workflow de publicação cria tags pelo SHA do commit; em tags Git `v*`, também
cria a tag da versão. A tag `latest` é publicada somente em pushes para `main`.
Pull requests executam as validações, mas não publicam imagens.

## Acesso às imagens

Os pacotes GHCR podem ser privados. Para pacotes privados, crie um token de
acesso pessoal com o escopo `read:packages` e crie o Secret no namespace de
destino:

```sh
kubectl create secret docker-registry ghcr-pull-secret \
  --docker-server=ghcr.io \
  --docker-username=guilhermedve \
  --docker-password=SEU_TOKEN_COM_READ_PACKAGES
```

Se os pacotes forem públicos, o Secret pode continuar existindo ou ser removido
dos Deployments antes da aplicação dos manifests.

## Configuração do backend

Crie o Secret `encurtador-backend-env` no mesmo namespace, sem versionar seus
valores:

```sh
kubectl create secret generic encurtador-backend-env \
  --from-literal=PORT=3000 \
  --from-literal=FRONTEND_URL=https://SEU_FRONTEND \
  --from-literal=PUBLIC_BASE_URL=https://SUA_API
```

## Implantação e operação

```sh
kubectl apply -f k8s/
kubectl rollout status deployment/backend
kubectl rollout status deployment/frontend
kubectl get deployments,services,pods
kubectl port-forward service/frontend 8080:80
kubectl port-forward service/backend 3000:3000
```

Os Services são internos ao cluster: `frontend` atende na porta 80 e `backend`
na porta 3000. O nginx do frontend usa o hostname `backend` para `/api/`.

Publicar uma nova imagem com a tag `latest` não reinicia Pods existentes. Para
consumir uma imagem nova, use uma tag imutável (por exemplo, o SHA) e atualize
o Deployment, ou execute `kubectl rollout restart deployment/backend` e
`kubectl rollout restart deployment/frontend`.
