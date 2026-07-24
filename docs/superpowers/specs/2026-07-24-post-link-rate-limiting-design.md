# Rate Limiting do POST /api/links

**Status:** aprovado em conversa em 2026-07-24

## Contexto

O encurtador executará inicialmente uma única instância ou um único container
do backend. O endpoint público `POST /api/links` ainda não possui proteção
contra criação abusiva de links. A solução inicial deve ser compatível com
essa implantação simples e não deve introduzir Redis, banco de dados ou
infraestrutura adicional.

## Objetivo

Limitar cada endereço IP a 10 tentativas por janela de 60 segundos no
`POST /api/links`, retornando uma resposta HTTP previsível quando o limite for
excedido.

## Fora do escopo

- Limitar `GET /:code` ou `GET /health`.
- Compartilhar contadores entre processos, containers ou réplicas.
- Persistir contadores após reinicialização.
- Adicionar Redis, banco de dados, AWS WAF ou rate limiting no proxy.
- Alterar o frontend.
- Adicionar autenticação ou bloqueios permanentes.

## Abordagens consideradas

### Contador próprio em memória

É a abordagem escolhida. Mantém uma entrada pequena por IP, não adiciona
dependências e permite testar o relógio, a expiração e os cabeçalhos de forma
determinística.

### Pacote externo para Elysia

Reduz parte do código, mas adiciona uma dependência para um comportamento
pequeno e dificulta controlar precisamente a resolução de IP e o contrato de
resposta.

### Nginx, AWS WAF ou armazenamento distribuído

É adequado para múltiplas instâncias e proteção na borda, mas está fora do
escopo da implantação inicial em uma única instância.

## Comportamento

- A chave do limite será o endereço IP do cliente.
- Cada IP terá uma janela fixa independente de 60 segundos.
- As primeiras 10 tentativas da janela serão encaminhadas normalmente.
- A 11ª tentativa e as seguintes, antes da renovação, retornarão
  `429 Too Many Requests`.
- Toda tentativa ao `POST /api/links` contará, inclusive URL inválida ou URL já
  existente. Isso impede que entradas inválidas sejam usadas para contornar a
  proteção.
- Quando a janela expirar, a próxima tentativa iniciará uma nova janela.
- Reiniciar o processo apagará os contadores, o que é aceitável para a
  implantação inicial.

## Contrato HTTP

As respostas aceitas e rejeitadas incluirão:

- `RateLimit-Limit`: quantidade máxima configurada.
- `RateLimit-Remaining`: quantidade disponível na janela atual.
- `RateLimit-Reset`: segundos inteiros até a renovação da janela.

Uma resposta `429` também incluirá:

- `Retry-After`: segundos inteiros até a próxima tentativa permitida.
- Corpo JSON:

```json
{
  "error": "Muitas requisições. Tente novamente em instantes."
}
```

O valor de tempo será arredondado para cima e nunca será inferior a um
segundo enquanto a requisição estiver bloqueada.

## Configuração

O backend aceitará estas variáveis:

```dotenv
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_SECONDS=60
TRUST_PROXY=false
```

- `RATE_LIMIT_MAX` deve ser um inteiro positivo.
- `RATE_LIMIT_WINDOW_SECONDS` deve ser um inteiro positivo.
- `TRUST_PROXY` aceita somente `true` ou `false`.
- Valores ausentes usarão os padrões acima.
- Valores presentes e inválidos impedirão a inicialização com uma mensagem
  explícita, seguindo a validação já aplicada a `PORT`.

## Resolução segura do IP

Com `TRUST_PROXY=false`, o endereço será obtido da conexão reconhecida pelo
servidor Bun. Cabeçalhos enviados pelo cliente não serão confiáveis.

Com `TRUST_PROXY=true`, será usado o primeiro endereço da lista
`X-Forwarded-For`, após remoção de espaços. Essa opção somente poderá ser
ativada quando o backend estiver atrás de um proxy controlado que substitua o
cabeçalho recebido do cliente.

Se o servidor não fornecer um endereço e não houver proxy confiável, será
usada uma chave compartilhada `unknown`. A ausência do IP não poderá desativar
o rate limiting.

## Componentes

### Configuração

`backend/src/config/env.ts` será responsável por validar e expor os três novos
valores.

### Armazenamento em memória

Um componente isolado manterá, por IP:

- número de tentativas;
- instante de renovação da janela.

Ele receberá o relógio como dependência para permitir testes sem esperas
reais. Entradas expiradas serão removidas durante o consumo por meio de
limpeza periódica baseada no próprio relógio, sem criar temporizadores que
mantenham o processo aberto.

### Resolução de endereço

Um resolvedor isolado escolherá entre o endereço da conexão e
`X-Forwarded-For` conforme `TRUST_PROXY`. A lógica será testável sem abrir uma
porta de rede.

### Integração Elysia

Um hook restrito ao `POST /api/links` consumirá uma tentativa antes do
controller:

1. resolve o IP;
2. consulta e atualiza o contador;
3. grava os cabeçalhos de limite;
4. encerra a requisição com `429` quando necessário;
5. caso contrário, permite a validação e criação ou reutilização do link.

O hook não será registrado globalmente, evitando qualquer efeito nas rotas de
consulta e de saúde.

## Tratamento de erros

- Configuração inválida: falha imediata na inicialização.
- IP indisponível: uso da chave `unknown`.
- Limite excedido: resposta `429` com cabeçalhos e JSON definidos.
- Falhas existentes de validação, colisão ou URL desconhecida permanecem sem
  alteração.

## Testes

Os testes unitários cobrirão:

- valores padrão e rejeição de configurações inválidas;
- tentativas 1 a 10 permitidas e 11ª bloqueada;
- renovação exata após 60 segundos;
- isolamento entre dois IPs;
- remoção de entradas expiradas;
- `X-Forwarded-For` ignorado sem proxy confiável;
- uso do primeiro IP encaminhado com proxy confiável;
- fallback para `unknown`.

Os testes de integração cobrirão:

- cabeçalhos nas respostas permitidas;
- `429`, corpo JSON e `Retry-After` ao exceder o limite;
- contagem de uma requisição com URL inválida;
- `GET /:code` e `GET /health` fora do limite.

Ao final, toda a suíte existente deverá continuar passando.

## Critérios de aceitação

- Um IP não realiza mais de 10 tentativas dentro de cada janela fixa
  configurada.
- IPs diferentes possuem contadores independentes.
- Somente `POST /api/links` é limitado.
- O contrato de resposta e os padrões de configuração são documentados.
- Não é adicionada dependência de runtime.
- Testes e build local passam.
- A imagem do backend é construída e executada em smoke test quando a
  preparação Docker da branch permitir.

## Política de checkpoints para implementação

A implementação será dividida em etapas pequenas. Ao final de cada etapa:

1. executar os testes relevantes;
2. registrar um commit focado;
3. informar exatamente os arquivos alterados, comportamento entregue,
   comandos executados e resultados;
4. parar obrigatoriamente;
5. aguardar aprovação explícita antes de iniciar a etapa seguinte.

O plano de implementação deverá manter separadas, no mínimo:

1. configuração;
2. núcleo do contador em memória;
3. resolução segura do IP;
4. integração exclusiva com `POST /api/links`;
5. testes de integração, documentação e verificação final.
