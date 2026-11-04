import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { AppHeader, SiteFooter } from "@/components/SiteChrome";
import { redirectIfLoggedIn } from "@/lib/session";

export const metadata: Metadata = { title: "Sign up — CalorieAI" };

export default async function SignupPage() {
  await redirectIfLoggedIn();

  return (
    <>
      <AppHeader />
      <main className="auth-page">
        <div className="auth-card">
          <span className="eyebrow">Get started</span>
          <h1>Create your account</h1>
          <AuthForm mode="signup" />
          <p className="auth-switch">
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
