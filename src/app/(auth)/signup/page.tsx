import Link from "next/link";
import { signup } from "@/lib/actions/auth";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checkEmail?: string }>;
}) {
  const { error, checkEmail } = await searchParams;

  if (checkEmail) {
    return (
      <div className="auth-card card">
        <h1 className="auth-title">Cek email kamu</h1>
        <div className="banner banner-success">
          Kami sudah mengirim link konfirmasi ke email kamu. Klik link tersebut
          untuk mengaktifkan akun, lalu masuk.
        </div>
        <p className="auth-alt muted">
          Sudah konfirmasi? <Link href="/login">Masuk</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="auth-card card">
      <div className="stack" style={{ gap: "var(--space-2)" }}>
        <h1 className="auth-title">Daftar</h1>
        <p className="muted">
          Buat akun Formo — fokus ke isi, formatnya kami yang urus.
        </p>
      </div>

      {error ? <div className="banner banner-danger">{error}</div> : null}

      <form action={signup} className="stack">
        <label className="field">
          <span>
            Nama lengkap <span className="muted">(opsional)</span>
          </span>
          <input type="text" name="full_name" autoComplete="name" />
        </label>
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
            minLength={6}
            autoComplete="new-password"
          />
        </label>
        <button type="submit" className="btn btn-block">
          Daftar
        </button>
      </form>

      <p className="auth-alt muted">
        Sudah punya akun? <Link href="/login">Masuk</Link>
      </p>
    </div>
  );
}
