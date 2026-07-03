"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * Tombol submit dengan state loading otomatis via `useFormStatus`.
 * Harus dipakai di dalam sebuah <form action=...>.
 */
export function PendingButton({
  children,
  pendingLabel = "Memproses…",
  className = "btn",
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
