import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { AppHeader, SiteFooter } from "@/components/SiteChrome";
import { redirectIfLoggedIn } from "@/lib/session";

export const metadata: Metadata = { title: "Log in — CalorieAI" };

export default async function LoginPage() {
  await redirectIfLoggedIn();

  return (
    <>
      <AppHeader />
      <main className="auth-page">
        <div className="auth-card">
          <span className="eyebrow">Welcome back</span>
          <h1>Log in to CalorieAI</h1>
          <AuthForm mode="login" />
          <p className="auth-switch">
            New here? <Link href="/signup">Create an account</Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
