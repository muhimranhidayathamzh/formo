import Link from "next/link";
import { login } from "@/lib/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="auth-card card">
      <div className="stack" style={{ gap: "var(--space-2)" }}>
        <h1 className="auth-title">Masuk</h1>
        <p className="muted">Selamat datang kembali di Formo.</p>
      </div>

      {error ? <div className="banner banner-danger">{error}</div> : null}

      <form action={login} className="stack">
        <label className="field">
          <span>Email</span>
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
          />
        </label>
        <button type="submit" className="btn btn-block">
          Masuk
        </button>
      </form>

      <p className="auth-alt muted">
        Belum punya akun? <Link href="/signup">Daftar</Link>
      </p>
    </div>
  );
}
