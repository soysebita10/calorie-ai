import Link from "next/link";
import type { ReactNode } from "react";

export function LogoMark() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></svg>
    </span>
  );
}

/** Header for the app pages (login, signup, dashboard). */
export function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="site-header">
      <div className="container nav">
        <Link href="/" className="logo" aria-label="CalorieAI home">
          <LogoMark />
          CalorieAI
        </Link>
        {children}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <Link href="/" className="logo logo-footer">CalorieAI</Link>
          <p>Track your calories smarter with AI.</p>
        </div>
        <div className="footer-meta">
          <p>Founded by <strong>Sebastian Nieves</strong></p>
          <p>&copy; {new Date().getFullYear()} CalorieAI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
