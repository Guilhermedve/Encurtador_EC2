export function Header() {
  return (
    <header className="relative z-10 flex h-14 items-center justify-between px-5 sm:px-8">
      <span
        className="text-sm font-black tracking-[0.14em] text-white select-none"
        style={{ fontFamily: '"Space Grotesk", sans-serif' }}
      >
        EC2.SH
      </span>
      <a
        href="#sobre"
        className="text-xs font-black tracking-[0.14em] text-white/70 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        [ SOBRE ]
      </a>
    </header>
  )
}
