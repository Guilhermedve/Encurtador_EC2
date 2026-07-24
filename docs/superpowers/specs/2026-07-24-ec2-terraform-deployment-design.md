# Implantação do backend em EC2 com Terraform

**Status:** aprovado em conversa em 2026-07-24

## Contexto

O encurtador possui um backend Bun/Elysia empacotado em Docker e uma imagem
pública disponível no GitHub Container Registry (GHCR). A implantação inicial
terá uma única instância do backend, coerente com a persistência e o rate
limiting em memória.

A infraestrutura será preparada em uma feature branch própria:
`feat/ec2-terraform-deploy`. A branch parte de `origin/main` e preserva os dois
commits locais do rate limiting que ainda não estavam integrados à branch
remota.

## Objetivo

Criar uma implantação reproduzível do backend em uma EC2 `t3.micro` na região
`us-east-1`, provisionada por Terraform, com:

- imagem pública publicada pelo GitHub Actions no GHCR;
- execução por Docker Compose;
- HTTPS automático por Caddy;
- atualização automática do backend por Watchtower mantido;
- acesso administrativo por SSH;
- Elastic IP para o registro DNS manual no Cloudflare.

## Fora do escopo

- Implantar o frontend.
- Gerenciar DNS ou credenciais da Cloudflare com Terraform.
- Usar o modo proxied da Cloudflare.
- Criar banco de dados, Redis, RDS ou ElastiCache.
- Criar múltiplas instâncias, Auto Scaling Group ou Load Balancer.
- Usar ECS, EKS ou os manifests Kubernetes existentes.
- Criar backend remoto para o state do Terraform.
- Executar `terraform apply` sem novo consentimento explícito.
- Fazer push, abrir pull request ou fazer merge sem solicitação separada.

## Decisões aprovadas

| Item | Decisão |
| --- | --- |
| Aplicação na EC2 | Somente backend |
| Registry | GHCR público |
| Região | `us-east-1` |
| Instância | `t3.micro`, `amd64` |
| Sistema | Ubuntu Server 24.04 LTS |
| Volume raiz | `gp3`, criptografado, tamanho padrão da AMI |
| Endereço | Elastic IP |
| Administração | SSH com chave pública configurada posteriormente |
| SSH | Restrito por `ssh_allowed_cidr` |
| DNS | Registro `A` manual no Cloudflare |
| Cloudflare | DNS only |
| TLS | Caddy com HTTPS automático |
| State Terraform | Local e ignorado pelo Git |
| Atualização | GitHub Actions publica; Watchtower atualiza |

## Abordagens consideradas

### GitHub Actions e Watchtower

É a abordagem escolhida. O workflow valida e publica a tag `latest` somente
quando há push na `main`. O Watchtower consulta o GHCR e recria apenas o
container do backend quando o digest muda.

Essa abordagem não exige chave SSH nos secrets do GitHub, mas não possui
rollback automático. Um erro publicado em `latest` precisa de intervenção
manual.

### GitHub Actions com deploy por SSH

Ofereceria atualização imediata e um log central do deploy, mas exigiria
armazenar chave privada, IP e usuário da EC2 como secrets do GitHub. Não será
usado nesta etapa.

### Tags imutáveis e atualização manual

Teria rollback mais previsível, porém não atenderia à atualização automática
solicitada.

## Arquitetura

```text
push em main
    |
    v
GitHub Actions --testa e publica--> GHCR backend:latest
                                          |
                                          v
Terraform --> VPC/EC2 --> Docker Compose --> Watchtower
                              |                |
                              |                +--> atualiza somente backend
                              +--> Caddy --> backend:3000
```

O backend não publicará a porta 3000 no host. Apenas o Caddy publicará as
portas 80 e 443 e encaminhará requisições pela rede interna do Compose.

## Estrutura de arquivos

```text
.github/workflows/
  docker-publish.yml
  terraform-validate.yml

deploy/ec2/
  Caddyfile
  docker-compose.yml
  .env.example
  README.md

infra/terraform/
  versions.tf
  providers.tf
  variables.tf
  network.tf
  compute.tf
  outputs.tf
  terraform.tfvars.example
  README.md
  templates/
    cloud-init.sh.tftpl

.dockerignore
.gitignore
```

O Compose de EC2 será separado do `docker-compose.yml` de desenvolvimento para
não misturar build local, frontend e configuração de produção.

## Imagem Docker e GitHub Actions

A imagem usada na EC2 será:

```text
ghcr.io/guilhermedve/encurtador_ec2-backend:latest
```

O workflow existente continuará validando os workspaces e publicando as
imagens já previstas pelo repositório. Para o backend, deverá também:

1. construir a imagem usando `backend/Dockerfile`;
2. iniciar um container temporário;
3. aguardar `GET /health`;
4. falhar antes da publicação se o container não ficar saudável;
5. publicar tag de SHA;
6. publicar `latest` somente em push na `main`.

Pull requests executarão validação e smoke test, mas não publicarão imagens.
Nenhuma credencial GHCR será colocada na EC2 enquanto a imagem permanecer
pública.

Um workflow separado validará Terraform quando arquivos de infraestrutura
forem alterados:

- `terraform fmt -check -recursive`;
- `terraform init -backend=false`;
- `terraform validate`;
- `docker compose config` para o Compose de EC2 com valores de teste.

## Docker Compose de EC2

O arquivo `deploy/ec2/docker-compose.yml` conterá três serviços.

### Backend

- Imagem definida por `BACKEND_IMAGE`.
- `restart: unless-stopped`.
- Porta 3000 somente com `expose`, sem `ports`.
- Healthcheck em `GET /health`.
- Variáveis:
  - `NODE_ENV=production`;
  - `PORT=3000`;
  - `PUBLIC_BASE_URL=https://${DOMAIN_NAME}`;
  - `FRONTEND_URL=https://${DOMAIN_NAME}`;
  - `RATE_LIMIT_MAX=10`;
  - `RATE_LIMIT_WINDOW_SECONDS=60`;
  - `TRUST_PROXY=true`.
- Label de opt-in para atualização pelo Watchtower.

`TRUST_PROXY=true` é necessário porque o Caddy é o único cliente direto do
backend. Como o Cloudflare ficará em DNS only, o endereço remoto recebido pelo
Caddy será o endereço do usuário.

### Caddy

- Imagem oficial com versão estável verificada e fixada na implementação.
- Publicação TCP das portas 80 e 443.
- `restart: unless-stopped`.
- Volumes nomeados para certificados e configuração.
- `Caddyfile` montado como somente leitura.
- Proxy reverso para `backend:3000`.
- Sem opt-in para Watchtower.

O Caddy solicitará o certificado somente depois que o registro `A` do domínio
resolver para o Elastic IP e as portas 80/443 estiverem acessíveis.

### Watchtower

Será usada a imagem mantida:

```text
nickfedor/watchtower
```

A versão será fixada na implementação após consulta à release estável.

Configuração:

- acesso ao socket Docker;
- `WATCHTOWER_LABEL_ENABLE=true`;
- intervalo de 300 segundos;
- limpeza de imagens antigas;
- sem porta HTTP exposta;
- sem atualização do Caddy ou do próprio Watchtower;
- reinício automático do serviço Watchtower.

O socket Docker concede controle equivalente a root sobre o host. A limitação
por label reduz o escopo funcional, mas não remove esse privilégio.

## Terraform

### Versões

- Terraform compatível com `>= 1.6.0` e `< 2.0.0`.
- Provider `hashicorp/aws` compatível com `~> 6.0`.
- State local, sem bloco de backend remoto.
- `.terraform.lock.hcl` será versionado.

### Rede

O Terraform criará:

- VPC dedicada com DNS habilitado;
- uma subnet pública em uma Availability Zone de `us-east-1`;
- Internet Gateway;
- route table com rota IPv4 `0.0.0.0/0`;
- associação explícita entre subnet e route table.

Não haverá NAT Gateway.

### Security Group

Regras de entrada:

- TCP 22 somente de `var.ssh_allowed_cidr`;
- TCP 80 de `0.0.0.0/0`;
- TCP 443 de `0.0.0.0/0`.

Saída será liberada para que a instância instale pacotes, consulte o GHCR e
solicite certificados.

A porta 3000 não terá regra pública.

### AMI e instância

A AMI Ubuntu 24.04 LTS `amd64` será descoberta por parâmetro público do AWS
Systems Manager Parameter Store, evitando AMI ID fixo por região.

A instância terá:

- tipo padrão `t3.micro`;
- Key Pair criado a partir do conteúdo de `ssh_public_key_path`;
- root volume `gp3`, criptografado e removido na destruição;
- tamanho raiz herdado da AMI;
- IMDSv2 obrigatório;
- detailed monitoring desabilitado;
- Elastic IP associado;
- tags padronizadas com projeto e ambiente.

### Variáveis

Valores padrão:

```hcl
aws_region               = "us-east-1"
instance_type            = "t3.micro"
backend_image            = "ghcr.io/guilhermedve/encurtador_ec2-backend:latest"
rate_limit_max           = 10
rate_limit_window_seconds = 60
watchtower_poll_seconds  = 300
environment              = "production"
```

Valores obrigatórios:

```hcl
domain_name        = "api.exemplo.com"
ssh_public_key_path = "C:/Users/usuario/.ssh/id_ed25519.pub"
ssh_allowed_cidr   = "203.0.113.10/32"
```

Validações impedirão:

- domínio vazio ou contendo protocolo;
- arquivo de chave pública inexistente;
- CIDR SSH igual a `0.0.0.0/0`;
- intervalo Watchtower inferior a 60 segundos;
- limite ou janela de rate limiting não positivos.

### Outputs

O Terraform fornecerá:

- Elastic IP;
- ID da instância;
- hostname público da API;
- comando SSH completo;
- registro `A` que deverá ser criado no Cloudflare;
- comando para consultar o log do cloud-init.

## Cloud-init

O template `cloud-init.sh.tftpl` executará uma vez no primeiro boot:

1. habilitar falha imediata e registrar saída;
2. instalar Docker Engine e Compose Plugin pelo repositório oficial;
3. adicionar o usuário `ubuntu` ao grupo `docker`;
4. criar `/opt/encurtador`;
5. gravar `.env`, Compose e `Caddyfile` com permissões restritas;
6. executar `docker compose pull`;
7. executar `docker compose up -d`;
8. verificar o healthcheck do backend;
9. registrar conclusão.

O script será idempotente para gravação de arquivos e execução do Compose,
embora o `user_data` da EC2 seja executado automaticamente apenas no primeiro
boot.

## DNS e HTTPS

Após `terraform apply`, o usuário criará no Cloudflare:

```text
Type: A
Name: subdomínio escolhido
Content: <elastic_ip>
Proxy status: DNS only
```

O HTTPS ficará pendente até a propagação do DNS. Nenhum token da Cloudflare
será necessário ou armazenado.

## Atualização e rollback

Fluxo normal:

1. merge ou push aprovado na `main`;
2. GitHub Actions executa testes e smoke test;
3. workflow publica novo digest em `latest`;
4. Watchtower detecta a mudança em até 300 segundos;
5. Watchtower recria o backend e remove a imagem antiga.

Não haverá rollback automático baseado no healthcheck.

Rollback manual:

1. escolher uma tag imutável `sha-<commit>` já publicada;
2. alterar `BACKEND_IMAGE` em `/opt/encurtador/.env`;
3. executar `docker compose pull backend`;
4. executar `docker compose up -d backend`;
5. confirmar `GET /health`.

## Estado e credenciais

O state ficará em `infra/terraform/terraform.tfstate` e não poderá ser
versionado. Também serão ignorados:

- `.terraform/`;
- `*.tfstate`;
- `*.tfstate.*`;
- `*.tfvars`, exceto exemplos;
- crash logs e arquivos de plan.

Credenciais AWS serão obtidas pelo mecanismo padrão do provider, como perfil
local ou variáveis de ambiente. Access key e secret key não aparecerão nos
arquivos Terraform.

Como o state é local, sua perda impede o Terraform de relacionar os recursos
existentes com a configuração. O README exigirá backup seguro antes e depois
de mudanças.

## Testes e validações

Antes de qualquer infraestrutura real:

- testes Bun completos;
- build do frontend existente, para preservar o CI atual;
- build do backend Docker;
- execução temporária do backend Docker e `GET /health`;
- `docker compose config` no Compose local;
- `docker compose config` no Compose de EC2 com `.env` de teste;
- `terraform fmt -check -recursive`;
- `terraform init -backend=false`;
- `terraform validate`;
- inspeção de `terraform plan`.

`terraform plan` exigirá credenciais AWS e os valores obrigatórios. O plan
será revisado pelo usuário em checkpoint próprio.

## Checkpoints de implementação

A implementação será dividida em etapas independentes:

1. preparação da imagem Docker e smoke test;
2. Compose de EC2 com Caddy e Watchtower;
3. base Terraform e validações;
4. rede, segurança, EC2, Elastic IP e cloud-init;
5. workflows e documentação;
6. validação integrada local;
7. plan AWS com valores reais;
8. apply somente após aprovação separada.

Ao fim de cada etapa:

1. executar verificações específicas;
2. criar commit focado;
3. informar arquivos, comportamento, comandos e resultados;
4. informar custos, riscos ou pendências;
5. parar obrigatoriamente;
6. aguardar aprovação explícita antes da próxima etapa.

## Critérios de aceitação

- A branch contém somente mudanças necessárias à implantação EC2 e os commits
  do rate limiting preservados.
- A imagem backend inicia e responde a `GET /health`.
- O Compose de EC2 expõe somente Caddy.
- Watchtower monitora somente o backend.
- Terraform valida sem credenciais gravadas no repositório.
- SSH não aceita `0.0.0.0/0`.
- IMDSv2 está obrigatório.
- O volume raiz usa o tamanho da AMI, sem forçar 10 GB.
- Outputs descrevem exatamente a configuração manual do Cloudflare.
- Nenhum `terraform apply` ocorre sem aprovação explícita.

## Referências

- [Docker Engine no Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [Caddy Automatic HTTPS](https://caddyserver.com/docs/caddyfile/options)
- [Ubuntu AMI por SSM](https://documentation.ubuntu.com/aws/aws-how-to/instances/build-cloudformation-templates/)
- [Terraform local state](https://developer.hashicorp.com/terraform/language/state)
- [AWS public IPv4](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-ip-addressing.html)
- [Watchtower mantido](https://github.com/nicholas-fedor/watchtower)
