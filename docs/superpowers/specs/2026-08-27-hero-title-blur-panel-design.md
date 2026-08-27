# Painel de blur no título da hero

## Contexto

A landing page (`frontend/src/pages/HomePage.tsx`) usa fundo animado halftone (`HalftoneBackground`) + overlay de dithering. O card de input (`UrlShortenerCard.tsx`) já tem tratamento de legibilidade: `rounded-lg border border-white/12 bg-[rgba(13,13,13,0.85)] backdrop-blur-[12px]`. O bloco de título ("ENCURTE. COMPARTILHE. DOMINE.") e subtítulo, acima do card, não têm nenhum fundo — ficam soltos direto sobre a animação, sem blur.

## Objetivo

Melhorar legibilidade do título/subtítulo sobre o fundo animado, aplicando o mesmo tratamento visual de blur/transparência já usado no card, sem alterar mais nada do site (fundo animado, header, footer, card do input, comportamento).

## Escopo

- **Dentro do escopo:** envolver o bloco de título (`h1`) + subtítulo (`p`) em `frontend/src/pages/HomePage.tsx` (linhas ~16-33) num painel com blur, replicando o estilo do `UrlShortenerCard`.
- **Fora do escopo:** `HalftoneBackground`, `DitheringOverlay`, `Header`, `footer`, `UrlShortenerCard`, `ResultDisplay` — nenhuma mudança.

## Design

Novo `<div>` envolvendo título+subtítulo, com as mesmas classes/estilo do container do `UrlShortenerCard`:

```tsx
<div
  className="rounded-lg border bg-[rgba(13,13,13,0.85)] px-6 py-8 backdrop-blur-[12px] sm:px-8 sm:py-10"
  style={{ borderColor: 'rgba(255,255,255,0.12)' }}
>
  <h1 ...>ENCURTE. COMPARTILHE. DOMINE.</h1>
  <p ...>Cole sua URL...</p>
</div>
```

Mantém `text-center`, mesmas classes de tipografia do `h1`/`p` atuais. O `mb-8`/`mb-10` (espaçamento entre título e card) passa a ser margem do novo painel, não do wrapper interno.

Não reaproveita `UrlShortenerCard` como componente (título não tem form/estado) — duplica o estilo inline, é curto e não vale abstrair em componente compartilhado só por isso.

## Critérios de sucesso

- Título e subtítulo legíveis com blur atrás, mesmo visual do card (borda, cor, blur).
- Fundo animado, header, footer, card do input inalterados.
- Responsivo (mobile/desktop) mantendo o padding/tamanho de fonte já existentes (`clamp`).
