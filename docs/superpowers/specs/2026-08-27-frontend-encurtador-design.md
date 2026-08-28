# Frontend Encurtador de Links — Design Spec

**Data:** 2026-08-27  
**Escopo:** Landing page única (React 19 + TypeScript + Vite + Tailwind CSS)  
**Referência visual:** Figma Ecommerce Dark Theme + Halftone/Dithering estilo zine impresso

---

## 1. Decisões de Design

| Decisão | Escolha |
|---------|---------|
| Páginas | Landing page única — resultado inline |
| Paleta | Preto-e-branco puro (contraste máximo) |
| Intensidade Halftone/Dithering | Intenso — estética central, estilo zine |
| CSS framework | Tailwind CSS |
| Implementação efeitos | p5.js via `useEffect` + `useRef` (sem react-p5) |

---

## 2. Arquitetura de Componentes

```
frontend/src/
├── components/
│   ├── HalftoneBackground.tsx   ← canvas p5.js, fixed, z-0
│   ├── DitheringOverlay.tsx     ← SVG noise, fixed, z-1, pointer-events none
│   ├── Header.tsx               ← logo wordmark
│   ├── UrlShortenerCard.tsx     ← card principal com form + resultado
│   └── ResultDisplay.tsx        ← link gerado + botão copiar
├── pages/
│   └── HomePage.tsx             ← composição de todos os componentes
└── services/
    └── api.ts                   ← existente, sem alteração
```

### Camadas Visuais

| z-index | Componente | Técnica |
|---------|------------|---------|
| 0 | `HalftoneBackground` | p5.js — grid de círculos brancos animados por mouse |
| 1 | `DitheringOverlay` | SVG `feTurbulence` noise, opacity 0.06 |
| 10+ | Conteúdo HTML | Tailwind, texto branco sobre fundo |

---

## 3. Visual e Estilo

### Paleta

```
Background:   #000000
Surface:      #0D0D0D  (card)
Border idle:  rgba(255,255,255,0.12)
Border focus: #FFFFFF
Text primary: #FFFFFF
Text muted:   #666666
Accent btn:   bg #FFFFFF / text #000000  (hover inverte)
Error:        #FF3333
```

### Tipografia

- Fonte: `Space Grotesk` (Google Fonts)
- Headline: weight `900`, `clamp(3rem, 8vw, 6rem)`, `letter-spacing: -0.04em`
- Subheadline: weight `400`, `1.125rem`, cor muted
- Labels/botão: weight `700`, uppercase, `letter-spacing: 0.1em`

### HeroSection Layout

```
┌─────────────────────────────────────────┐
│                                         │
│   ENCURTE.                              │
│   COMPARTILHE.                          │
│   DOMINE.                               │
│                                         │
│   [ https://exemplo.com/...   ] [→]     │
│                                         │
│   ✓ ec2.sh/xK9p          [copiar]      │
│                                         │
└─────────────────────────────────────────┘
```

### UrlShortenerCard

- `border: 1px solid rgba(255,255,255,0.12)`
- `background: rgba(13,13,13,0.85)` + `backdrop-filter: blur(12px)`
- Input: sem border-radius, borda inferior only, fundo transparente
- Botão: `bg-white text-black` — hover `bg-black text-white border-white`, transição 200ms

### HalftoneBackground (p5.js)

- Grid de círculos brancos sobre fundo preto
- Raio de cada ponto proporcional à distância do cursor (range: 2px–16px)
- Sem mouse: padrão estático de tamanho médio (8px)
- FPS cap: 30 (`frameRate(30)`)
- Canvas `position: fixed`, `width: 100vw`, `height: 100vh`
- Cleanup: `p5.remove()` no return do `useEffect`

### DitheringOverlay

```svg
<filter id="dither">
  <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" />
  <feColorMatrix type="saturate" values="0" />
</filter>
```

- `opacity: 0.06`
- `mix-blend-mode: overlay`
- SVG `position: fixed`, cobre viewport inteiro via `width: 100vw; height: 100vh`

---

## 4. Estados do Form

| Estado | Visual |
|--------|--------|
| `idle` | Input vazio, botão `→` branco |
| `loading` | Botão: spinner 3 pontos CSS, input `pointer-events: none` |
| `success` | Área resultado desce via `max-height` transition (0 → auto) |
| `copied` | Botão "Copiar" → "✓ Copiado!" por 2s, depois reverte |
| `error` | Mensagem `#FF3333` abaixo do input, borda input vermelha |

---

## 5. Responsividade

| Breakpoint | Comportamento |
|------------|---------------|
| `<640px` (mobile) | Headline menor via clamp, card full-width, input + botão empilhados |
| `640px–1024px` (tablet) | Centralizado, max-width 640px |
| `>1024px` (desktop) | max-width 560px, centralizado no viewport |

---

## 6. Acessibilidade

- `role="alert"` no erro (já existe)
- `aria-busy="true"` no botão durante loading
- `aria-live="polite"` na área de resultado
- Contraste branco/preto = 21:1 (WCAG AAA)

---

## 7. Header e Footer

**Header:** Logo wordmark `EC2.SH`, `Space Grotesk 900`, tamanho `sm`, canto superior esquerdo. Sem nav.

**Footer:** `© 2026 Encurtador EC2` — texto muted, centralizado, uma linha.

---

## 8. Dependências a Adicionar

```bash
bun add p5
bun add -D @types/p5
```

Tailwind v4 via Vite plugin:
```bash
bun add tailwindcss @tailwindcss/vite
```

Google Fonts `Space Grotesk` via link no `index.html`.

---

## 9. Critérios de Sucesso

- [ ] Halftone animado visível e responsivo ao mouse
- [ ] Dithering granulado cobre a viewport sem ofuscar texto
- [ ] Form encurta link e exibe resultado inline sem reload
- [ ] Botão copiar funciona e dá feedback visual de 2s
- [ ] Responsive em 375px, 768px e 1440px
- [ ] Sem erros de console em produção (`bun run build`)
- [ ] Contraste texto/fundo ≥ 7:1 (WCAG AA) em todos os estados
