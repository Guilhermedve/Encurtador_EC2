# Geração e reutilização de links curtos — especificação

## Objetivo

Receber uma URL original HTTPS, gerar um código alfanumérico seguro com exatamente nove caracteres e devolver uma URL curta no formato `{PUBLIC_BASE_URL}/{codigo}`. Quando a mesma URL original for enviada novamente, a aplicação deve reutilizar o código já associado a ela.

## Escopo

Esta feature inclui:

- validação HTTPS no front-end e no back-end;
- normalização da URL original;
- geração criptograficamente segura de códigos Base62 com nove caracteres;
- reutilização do código de uma URL já conhecida;
- detecção de colisões e novas tentativas de geração;
- montagem da URL pública a partir de configuração;
- contrato de persistência independente da tecnologia de banco;
- persistência temporária em memória;
- testes unitários e de integração da regra.

Esta feature não inclui:

- instalação ou configuração do PostgreSQL;
- escolha ou instalação de ORM;
- migrations, tabelas ou índices reais;
- Docker ou infraestrutura de banco;
- autenticação, expiração, métricas ou painel administrativo.

O PostgreSQL será implementado em outra feature. Até lá, os links continuarão sendo perdidos quando o processo reiniciar.

## Contrato HTTP

### Criar ou reutilizar link

`POST /api/links`

Corpo aceito:

```json
{
  "url": "https://exemplo.com/pagina"
}
```

Resposta HTTP `201` para uma URL nova:

```json
{
  "code": "aB7k2P9xQ",
  "originalUrl": "https://exemplo.com/pagina",
  "shortUrl": "https://linkcut.seudominio.com/aB7k2P9xQ"
}
```

Resposta HTTP `200` para uma URL já conhecida, contendo o mesmo código e a mesma URL curta retornados anteriormente.

Erros:

- HTTP `422` quando o valor estiver ausente, não for uma URL absoluta ou não usar o protocolo HTTPS;
- HTTP `503` quando não for possível obter um código único dentro do limite de tentativas;
- HTTP `500` para falhas internas não previstas.

### Redirecionar

`GET /:code`

- responde com HTTP `302` para a URL original quando o código existir;
- responde com HTTP `404` quando o código não existir.

## Regras de validação e normalização

O back-end é a fonte definitiva de validação. O front-end repete a restrição apenas para oferecer retorno imediato à pessoa usuária.

A função de normalização deve:

1. remover espaços antes e depois do valor;
2. construir uma instância de `URL`;
3. exigir `url.protocol === 'https:'`;
4. exigir um hostname não vazio;
5. devolver `url.toString()` como representação canônica usada para consulta e persistência.

São inválidos:

- texto comum;
- URLs relativas;
- `http://`, `ftp://`, `file://` ou qualquer protocolo diferente de `https:`;
- valores que o construtor `URL` não consiga interpretar como URL absoluta.

No React, o campo usa `type="url"`, `required` e `pattern="https://.*"`. A submissão também verifica a URL antes de chamar a API. Essa validação não substitui a verificação do back-end.

## Geração do código

O código deve:

- ter exatamente nove caracteres;
- usar o alfabeto `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`;
- ser gerado com `crypto.getRandomValues`;
- não usar `Math.random`;
- usar amostragem por rejeição para evitar viés ao converter bytes aleatórios para os 62 símbolos.

A geração usa bytes de `0` a `247`, pois `248` é o maior múltiplo de `62` que cabe no intervalo de um byte. Bytes maiores ou iguais a `248` são descartados. Cada byte aceito é convertido com `byte % 62`.

O limite será de dez tentativas de código por criação. Em cada tentativa, o service consulta se o código já existe. Uma colisão inicia outra tentativa. Se todas as dez tentativas colidirem, o service lança um erro próprio que a camada HTTP converte para `503`.

## Configuração da URL pública

A variável de ambiente será renomeada de `PUBLIC_API_URL` para `PUBLIC_BASE_URL`, porque representa a origem pública usada nos links curtos.

Exemplos:

```dotenv
PUBLIC_BASE_URL=http://localhost:3000
```

```dotenv
PUBLIC_BASE_URL=https://linkcut.seudominio.com
```

A configuração deve remover barras finais. A montagem sempre usa `${PUBLIC_BASE_URL}/${code}`, evitando URLs com `//` entre domínio e código.

## Componentes e responsabilidades

### `backend/src/utils/normalize-url.ts`

Exporta `normalizeHttpsUrl(value: string): string`. Não conhece HTTP, banco ou Elysia. Lança `InvalidHttpsUrlError` para entradas inválidas.

### `backend/src/utils/generate-code.ts`

Exporta `generateCode(size = 9): string`. Gera Base62 com fonte criptográfica e retorna exatamente a quantidade solicitada.

### `backend/src/repositories/link.repository.ts`

Define somente o contrato usado pela regra de negócio:

```ts
export interface StoredLink {
  code: string
  originalUrl: string
}

export interface LinkRepository {
  findByOriginalUrl(originalUrl: string): Promise<StoredLink | null>
  findByCode(code: string): Promise<StoredLink | null>
  save(link: StoredLink): Promise<StoredLink>
}
```

O contrato permite criar posteriormente um adaptador PostgreSQL sem alterar o service.

### `backend/src/repositories/in-memory-link.repository.ts`

Implementa temporariamente `LinkRepository` com dois mapas internos: um indexado pela URL normalizada e outro pelo código. Essa implementação permite reutilização e detecção de colisões durante a execução atual.

### `backend/src/services/link.service.ts`

Recebe um `LinkRepository` e uma função geradora em seu construtor. O método `create` passa a ser assíncrono e executa:

1. normalizar e validar a URL;
2. consultar `findByOriginalUrl`;
3. devolver o link existente quando encontrado;
4. gerar um código de nove caracteres;
5. consultar `findByCode`;
6. repetir a geração em caso de colisão, no máximo dez vezes;
7. salvar o novo vínculo;
8. montar e devolver a URL curta.

O método de consulta do redirecionamento usa `findByCode` e devolve a URL original ou `undefined`.

### Controller, rotas e schemas

O controller aguarda os métodos assíncronos do service. A rota de criação diferencia criação (`201`) de reutilização (`200`) por meio de um campo interno do resultado do service, sem expor esse campo no JSON público.

O schema mantém a validação estrutural básica. A validação semântica de HTTPS permanece em `normalizeHttpsUrl`, para que a mesma regra seja exercitada fora da camada HTTP e coberta por testes unitários.

### Front-end

O formulário bloqueia a submissão de entradas que não representem URL HTTPS, mostra uma mensagem específica e não chama `createShortLink` nesses casos. Erros retornados pela API continuam sendo apresentados sem expor detalhes internos.

## Fluxo de dados

```text
ShortLinkForm
  -> POST /api/links
  -> linkRoutes
  -> linkController
  -> linkService.create
  -> normalizeHttpsUrl
  -> LinkRepository.findByOriginalUrl
     -> existente: reutiliza
     -> ausente: generateCode -> findByCode -> save
  -> PUBLIC_BASE_URL + "/" + code
  -> resposta ao React
```

No redirecionamento:

```text
GET /:code
  -> linkController
  -> linkService.findOriginalUrl
  -> LinkRepository.findByCode
  -> 302 ou 404
```

## Concorrência e persistência futura

A lógica de aplicação reduz colisões, mas não substitui garantias atômicas do banco. A futura feature PostgreSQL deverá criar restrições únicas para `code` e `original_url` e tratar violações causadas por requisições concorrentes.

Essas restrições são requisitos para a feature de persistência futura, não trabalho autorizado nesta feature.

## Tratamento de erros

Erros de domínio terão classes distintas:

- `InvalidHttpsUrlError`: convertido em HTTP `422`;
- `CodeGenerationExhaustedError`: convertido em HTTP `503`.

Erros inesperados continuam no tratador genérico, são registrados no servidor e retornam HTTP `500` sem stack trace ou detalhes internos.

## Estratégia de testes

### Testes unitários

- aceita e normaliza URL HTTPS;
- remove espaços externos;
- rejeita texto, URL relativa e protocolos diferentes de HTTPS;
- gera exatamente nove caracteres;
- usa somente caracteres Base62;
- reutiliza o vínculo quando a URL normalizada já existe;
- tenta novamente quando o código colide;
- falha depois de dez colisões;
- monta a URL curta sem barra duplicada.

O gerador será injetável no service para tornar colisões determinísticas nos testes.

### Testes de integração da API

- `POST /api/links` cria e retorna `201`;
- repetir a URL equivalente retorna `200` e o mesmo código;
- entrada não HTTPS retorna `422`;
- `GET /:code` existente retorna `302` e o cabeçalho `Location` correto;
- código desconhecido retorna `404`.

### Testes do front-end

O plano incluirá validação de tipo e build do React. A introdução de uma biblioteca de testes de interface fica fora desta feature para não ampliar dependências apenas para um único formulário.

## Critérios de aceite

- nenhuma entrada diferente de uma URL HTTPS chega à chamada de criação pelo formulário;
- o back-end rejeita diretamente qualquer entrada que não seja uma URL HTTPS;
- cada código criado contém exatamente nove caracteres Base62;
- a mesma URL normalizada reutiliza o mesmo código durante a vida do processo;
- códigos em colisão nunca sobrescrevem links existentes;
- a URL curta usa exclusivamente `PUBLIC_BASE_URL` e o código;
- todos os testes atuais e novos passam;
- o build do front-end passa;
- nenhuma dependência, conexão, migration ou configuração PostgreSQL é adicionada.
