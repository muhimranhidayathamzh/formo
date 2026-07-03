import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guard tambahan di server (selain middleware) demi keamanan.
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="brand">Formo</span>
        <form action={signOut}>
          <button type="submit" className="btn-ghost">
            Keluar
          </button>
        </form>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
