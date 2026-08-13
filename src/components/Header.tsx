import { ShieldCheck, Menu } from 'lucide-react'

export function Header() {
  return (
    <header className="site-header no-print">
      <div className="site-header__inner">
        <div className="site-header__left">
          <button type="button" className="site-header__menu-btn" aria-label="Abrir menú">
            <Menu size={22} aria-hidden="true" />
          </button>
          <span className="site-header__brand">ADRA</span>
        </div>
        <div className="site-header__right">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>Confianza que transforma</span>
        </div>
      </div>
    </header>
  )
}
