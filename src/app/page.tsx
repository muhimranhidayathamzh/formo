import { redirect } from "next/navigation";

export default function Home() {
  // Middleware membelokkan ke /login kalau belum terautentikasi.
  redirect("/dashboard");
}
