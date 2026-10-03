import { ArrowRight, Building2, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loginAction } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <main className="login-page">
      <section className="login-story" aria-label="Cell U Tech FZCO HRMS">
        <div className="login-brand">
          <Image className="brand-logo" src="/logo-main.png" alt="Cell U Tech FZCO" width={180} height={42} priority />
        </div>
        <div className="story-content">
          <p className="eyebrow"><span /> PEOPLE, ACROSS EVERY BORDER</p>
          <h1>Work moves forward when people do.</h1>
          <p className="story-copy">
            One considered place for teams, time away, and the work that connects us.
          </p>
          <div className="story-footer">
            <div className="avatar-stack" aria-hidden="true">
              <span>AY</span><span>PN</span><span>NB</span><span>+8</span>
            </div>
            <p>One team. <strong>Two offices.</strong></p>
          </div>
        </div>
        <div className="story-note"><Building2 size={15} /> Dubai <span>·</span> London</div>
      </section>

      <section className="login-panel">
        <div className="login-panel-inner">
          <div className="mobile-brand login-brand">
            <Image className="brand-logo" src="/logo-main.png" alt="Cell U Tech FZCO" width={180} height={42} priority />
          </div>
          <div className="login-heading">
            <p className="eyebrow">WELCOME BACK</p>
            <h2>Sign in to your workspace</h2>
            <p>Use your work email and password to continue.</p>
          </div>

          <form action={loginAction} className="login-form">
            <label htmlFor="email">Work email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="you@company.com"
              required
            />
            <div className="password-label">
              <label htmlFor="password">Password</label>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              required
            />
            {error === "credentials" && (
              <p className="form-error" role="alert">Those details did not match an active account.</p>
            )}
            <button type="submit" className="login-submit">
              Sign in <ArrowRight size={17} />
            </button>
          </form>

          <p className="login-security"><ShieldCheck size={15} /> Secure access for Cell U Tech FZCO employees</p>
        </div>
        <footer className="login-copyright">© 2026 Cell U Tech FZCO <span>·</span> People Operations</footer>
      </section>
    </main>
  );
}