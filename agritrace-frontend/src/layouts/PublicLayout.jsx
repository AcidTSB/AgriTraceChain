import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function PublicLayout() {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-background">
      {/* Sửa md:backdrop-blur-xl thành backdrop-blur-xl để áp dụng cho cả mobile */}
      <header className="sticky top-0 z-50 w-full bg-surface-container-lowest/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-8">
          <NavLink to="/" onClick={closeMenu} className="font-headline text-2xl font-extrabold tracking-tighter text-primary">
            AgriTrace
          </NavLink>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 font-headline font-semibold tracking-tight md:flex">
            <NavLink to="/about" className="text-on-surface-variant transition-colors hover:text-primary">
              {t("common.about")}
            </NavLink>
            <NavLink to="/faq" className="text-on-surface-variant transition-colors hover:text-primary">
              {t("common.faq")}
            </NavLink>
            <NavLink to="/trace-entry" className="text-on-surface-variant transition-colors hover:text-primary">
              {t("public.traceEntry")}
            </NavLink>
            <NavLink to="/scan-qr" className="text-on-surface-variant transition-colors hover:text-primary">
              {t("common.scanQr")}
            </NavLink>
          </nav>

          <div className="flex items-center gap-4">
            {/* Đăng nhập (Desktop) */}
            <NavLink to="/login" className="hidden md:block font-headline font-semibold text-primary transition-colors hover:text-surface-tint">
              {t("common.login")}
            </NavLink>

            {/* Hamburger Button (Mobile) */}
            <button
              className="md:hidden p-2 text-on-surface focus:outline-none"
              onClick={toggleMenu}
              aria-label="Toggle mobile menu"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Nav Menu (Chỉ hiển thị khi isMobileMenuOpen = true) */}
        {isMobileMenuOpen && (
          <div className="absolute left-0 top-16 w-full border-b border-outline-variant/20 bg-surface-container-lowest p-4 shadow-lg md:hidden">
            <nav className="flex flex-col gap-4 font-headline font-semibold tracking-tight">
              <NavLink to="/about" onClick={closeMenu} className="text-on-surface-variant transition-colors hover:text-primary">
                {t("common.about")}
              </NavLink>
              <NavLink to="/faq" onClick={closeMenu} className="text-on-surface-variant transition-colors hover:text-primary">
                {t("common.faq")}
              </NavLink>
              <NavLink to="/trace-entry" onClick={closeMenu} className="text-on-surface-variant transition-colors hover:text-primary">
                {t("public.traceEntry")}
              </NavLink>
              <NavLink to="/scan-qr" onClick={closeMenu} className="text-on-surface-variant transition-colors hover:text-primary">
                {t("common.scanQr")}
              </NavLink>
              <div className="my-2 h-px w-full bg-outline-variant/20" />
              <NavLink to="/login" onClick={closeMenu} className="text-primary transition-colors hover:text-surface-tint">
                {t("common.login")}
              </NavLink>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="w-full border-t border-outline-variant/20 bg-surface-container-lowest px-4 py-12 md:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="font-headline text-xl font-bold text-on-surface">AgriTrace</div>
          <p className="font-body text-xs uppercase tracking-widest text-primary">{t("layout.footerTagline")}</p>
          <p className="font-body text-xs uppercase tracking-widest text-outline">© 2026</p>
        </div>
      </footer>

    </div>
  );
}