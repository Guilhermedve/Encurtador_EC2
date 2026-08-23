import { ShortLinkForm } from '../components/ShortLinkForm'

export function HomePage() {
  return (
    <div className="app-layout">
      <header className="top-header">
        <a className="brand-badge" href="#encurtador" aria-label="Ir para o encurtador de links">
          <span className="brand-mark" aria-hidden="true">01</span>
          <span>LINK//CUT</span>
        </a>
        <div className="header-tag" aria-label="Identificação da interface">URL SHORTENER / V1.0</div>
      </header>

      <main className="main-wrapper">
        <section className="hero-header" aria-labelledby="page-title">
          <div className="hero-meta">
            <span>URL SHORTENER</span>
            <span>EST. 2026</span>
          </div>
          <h1 className="hero-title" id="page-title">
            LINKS <span className="title-longos">LONGOS.</span><br />
            <span className="highlight">CAMINHOS CURTOS.</span>
          </h1>
          <div className="hero-details">
            <p className="hero-subtitle">
              Transforme URLs HTTPS em links compactos, seguros e prontos para compartilhar.
            </p>
            <p className="hero-index" aria-hidden="true">[ 01—01 ]</p>
          </div>
        </section>

        <section className="shortener-section" id="encurtador" aria-labelledby="shortener-title">
          <div className="section-heading">
            <p>FERRAMENTA PRINCIPAL</p>
            <h2 id="shortener-title">ENCURTAR URL</h2>
          </div>
          <ShortLinkForm />
        </section>
      </main>

      <footer className="app-footer">
        <span>SISTEMA OPERACIONAL</span>
        <span>HTTPS ATIVO / BAIXA LATÊNCIA</span>
      </footer>
    </div>
  )
}
