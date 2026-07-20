# Prompt para implementar Kubernetes e publicação de imagens no GHCR

Implemente a infraestrutura Kubernetes e uma pipeline GitHub Actions para construir e publicar a imagem Docker desta aplicação no GitHub Container Registry (GHCR).

Antes de modificar qualquer arquivo:

1. Inspecione toda a estrutura relevante do projeto.
2. Leia `package.json`, arquivos de lock, `Dockerfile`, `.dockerignore`, configurações de ambiente e workflows existentes.
3. Identifique:
   - o comando correto de instalação;
   - o comando de build;
   - o comando de testes;
   - o comando de inicialização da aplicação;
   - a porta realmente utilizada pela aplicação;
   - se o projeto usa Bun, Node.js ou outro runtime;
   - se já existe alguma configuração Docker, Kubernetes ou GitHub Actions.
4. Não presuma nomes, portas, caminhos ou comandos que não tenham sido confirmados no repositório.
5. Preserve os arquivos e workflows existentes sempre que possível.

## Objetivo

Criar:

- manifests Kubernetes para `Deployment` e `Service`;
- pipeline GitHub Actions para testar, construir e publicar a imagem no GHCR;
- documentação mínima para configurar e executar a solução.

## 1. Kubernetes

Crie os manifests dentro do diretório `k8s/`, preferencialmente:

- `k8s/deployment.yaml`
- `k8s/service.yaml`

Se o projeto já possuir uma convenção diferente, siga a convenção existente.

### Deployment

O `Deployment` deve:

- usar `apps/v1`;
- possuir nomes e labels consistentes;
- iniciar com uma quantidade segura de réplicas, preferencialmente `2`;
- utilizar a imagem:

  `ghcr.io/<github-owner>/<repository>:latest`

- manter os placeholders `<github-owner>` e `<repository>` somente se não for possível determinar esses valores pelo remote Git;
- configurar `containerPort` com a porta real da aplicação;
- configurar `imagePullPolicy: Always` para a tag `latest`;
- definir `resources.requests` e `resources.limits` com valores iniciais razoáveis;
- implementar `readinessProbe` e `livenessProbe`;
- usar um endpoint de health check existente;
- se não existir endpoint HTTP de health check, não inventar uma rota na aplicação sem necessidade: use uma probe compatível, como `tcpSocket`, ou implemente um endpoint simples somente se isso estiver alinhado à arquitetura atual;
- utilizar `env` ou `envFrom` para configurações, sem colocar credenciais diretamente no manifesto;
- referenciar `Secret` para dados sensíveis quando necessário;
- possuir estratégia de atualização `RollingUpdate`;
- definir `terminationGracePeriodSeconds`;
- manter selectors e labels exatamente compatíveis.

Não adicione banco de dados, Redis, Ingress, cert-manager, Helm ou outros componentes que não tenham sido solicitados.

### Service

O `Service` deve:

- usar `v1`;
- ser do tipo `ClusterIP`;
- selecionar os pods do `Deployment` pelas labels corretas;
- expor uma porta apropriada, preferencialmente `80`;
- encaminhar para a porta real do container usando `targetPort`;
- usar porta nomeada quando isso melhorar a associação com as probes.

Caso a aplicação precise obrigatoriamente ser acessada externamente, documente que será necessário adicionar um `Ingress` ou alterar o tipo do serviço, mas não implemente isso sem evidência no projeto.

### Imagens privadas

Considere que o pacote no GHCR pode ser privado:

- não inclua tokens reais;
- documente como criar um `imagePullSecret`;
- explique onde adicionar `imagePullSecrets` no `Deployment`;
- se adicionar `imagePullSecrets` no manifesto, utilize apenas um nome genérico, como `ghcr-pull-secret`.

## 2. GitHub Actions e GHCR

Crie ou ajuste um workflow em:

- `.github/workflows/docker-publish.yml`

Antes de criar um novo workflow, verifique se já existe alguma pipeline Docker que possa ser atualizada sem duplicar funcionalidades.

O workflow deve:

- executar em pushes para a branch principal real do repositório;
- executar na criação de tags no formato `v*`;
- executar em pull requests apenas para validar build e testes;
- não publicar imagens durante pull requests;
- permitir execução manual com `workflow_dispatch`;
- usar `actions/checkout` em versão estável e atual;
- executar os testes e o build da aplicação antes da publicação;
- utilizar o gerenciador de pacotes detectado no projeto;
- respeitar o arquivo de lock e usar instalação reproduzível;
- usar `docker/setup-buildx-action`;
- autenticar no `ghcr.io` com:
  - `github.actor`;
  - `secrets.GITHUB_TOKEN`;
- configurar as permissões mínimas necessárias:
  - `contents: read`;
  - `packages: write`;
- utilizar `docker/metadata-action` para gerar tags e labels;
- utilizar `docker/build-push-action` para construir e publicar a imagem;
- publicar a imagem com nome em letras minúsculas:

  `ghcr.io/<owner>/<repository>`

- gerar tags apropriadas:
  - SHA do commit;
  - nome da tag Git, quando o evento for uma tag;
  - `latest` somente quando o push ocorrer na branch principal;
- usar cache do GitHub Actions:
  - `cache-from: type=gha`;
  - `cache-to: type=gha,mode=max`;
- não armazenar tokens, senhas ou credenciais diretamente no YAML;
- não executar `docker push` em pull requests;
- funcionar com o `Dockerfile` realmente existente no projeto.

Se o nome do owner ou repositório puder conter letras maiúsculas, garanta que o nome final da imagem seja convertido para letras minúsculas antes de ser utilizado pelo Docker.

Não use actions obsoletas ou referências genéricas como `@master`.

## 3. Docker

Revise o `Dockerfile` e o `.dockerignore` existentes.

Somente modifique esses arquivos se necessário para que:

- a imagem seja construída com sucesso;
- a instalação seja reproduzível;
- o build utilize o runtime e o gerenciador de pacotes corretos;
- arquivos desnecessários não sejam enviados no contexto;
- segredos e arquivos `.env` não entrem na imagem;
- a aplicação inicie corretamente dentro do container;
- a porta exposta corresponda à utilizada no Kubernetes;
- a imagem final seja adequada para produção;
- seja utilizado multi-stage build quando isso trouxer benefício real.

Não faça uma reescrita desnecessária se o Dockerfile atual já estiver correto.

## 4. Documentação

Atualize o `README.md` ou crie `k8s/README.md` com:

1. nome final esperado da imagem no GHCR;
2. eventos que executam a pipeline;
3. tags de imagem geradas;
4. como tornar o pacote GHCR público, se desejado;
5. como autenticar manualmente no GHCR;
6. como criar o secret para imagens privadas, sem incluir token real;
7. como aplicar os manifests:

   `kubectl apply -f k8s/`

8. como verificar o rollout:

   `kubectl rollout status deployment/<deployment-name>`

9. como listar pods e serviços;
10. como testar localmente o `Service` usando `kubectl port-forward`;
11. quais variáveis de ambiente e Secrets precisam ser configurados;
12. observação de que publicar uma nova imagem com `latest` não garante sozinho que pods existentes sejam reiniciados.

## 5. Validação obrigatória

Depois da implementação:

1. execute os testes existentes;
2. execute o build da aplicação;
3. construa a imagem Docker localmente;
4. valide a sintaxe do workflow;
5. valide os manifests Kubernetes;
6. quando `kubectl` estiver disponível, execute:

   `kubectl apply --dry-run=client -f k8s/`

7. confira se:
   - labels e selectors são compatíveis;
   - `containerPort`, `targetPort` e probes usam a porta correta;
   - o nome da imagem é válido e está em letras minúsculas;
   - PRs não publicam imagens;
   - `latest` é publicada apenas pela branch principal;
   - nenhuma credencial foi adicionada ao Git;
   - workflows existentes não foram duplicados ou quebrados.

Se Docker, kubectl ou outra ferramenta não estiver disponível, informe claramente quais validações não puderam ser executadas. Não fabrique resultados.

## Restrições

- Não faça commit nem push.
- Não altere arquivos sem relação com a tarefa.
- Não introduza Helm, Ingress ou ferramentas adicionais sem necessidade.
- Não remova workflows existentes sem justificar.
- Não inclua segredos reais.
- Não altere o código da aplicação, exceto quando estritamente necessário para health checks ou funcionamento correto no container.
- Mantenha o padrão e o estilo do projeto.

## Resultado esperado

Ao terminar, apresente:

1. resumo das decisões tomadas;
2. lista de arquivos criados e modificados;
3. nome completo da imagem GHCR;
4. gatilhos e tags configurados na pipeline;
5. comandos de implantação;
6. resultados reais dos testes, build, Docker build e validação Kubernetes;
7. limitações ou configurações manuais ainda necessárias.
