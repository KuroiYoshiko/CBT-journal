"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Heart, LockKeyhole, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabase();
    void supabase.auth.getUser().then(({ data }) => { if (data.user) router.replace("/dashboard"); });
  }, [configured, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice(""); setBusy(true);
    try {
      if (!configured) throw new Error("Brakuje konfiguracji Supabase. Uzupełnij .env.local zgodnie z README.");
      const supabase = getSupabase();
      if (mode === "register") {
        const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password });
        if (authError) throw authError;
        if (data.session) router.replace("/dashboard");
        else setNotice("Sprawdź skrzynkę e-mail i potwierdź adres, a następnie zaloguj się.");
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        router.replace("/dashboard");
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Nie udało się połączyć. Spróbuj ponownie.";
      setError(message === "Invalid login credentials" ? "Nieprawidłowy adres e-mail lub hasło." : message);
    } finally { setBusy(false); }
  }

  return <div className="auth-layout min-h-screen bg-[#f7faf6] lg:grid lg:grid-cols-[.9fr_1.1fr]">
    <div className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#245e52] p-12 text-white lg:flex xl:p-16">
      <div className="absolute -right-32 -top-20 h-[500px] w-[500px] rounded-full border border-white/10" /><div className="absolute -right-10 top-24 h-[390px] w-[390px] rounded-full border border-white/10" /><div className="absolute -bottom-44 -left-44 h-[560px] w-[560px] rounded-full bg-[#347461] opacity-70" />
      <div className="relative"><Brand light /></div>
      <div className="relative max-w-md"><span className="mb-7 grid h-14 w-14 place-items-center rounded-2xl bg-white/15"><Heart size={28} strokeWidth={1.6} /></span><h1 className="font-display text-[clamp(3rem,4vw,5rem)] leading-[1.07]">Każda myśl zasługuje na chwilę uwagi.</h1><p className="mt-7 max-w-sm text-lg leading-8 text-[#d5e7df]">Zbuduj własną przestrzeń do refleksji. Twoje notatki są dostępne tylko dla Ciebie.</p></div>
      <div className="relative inline-flex items-center gap-3 text-sm text-[#d7e9df]"><ShieldCheck size={18} /> Prywatny dziennik wspierający terapię CBT</div>
    </div>
    <div className="flex min-h-screen flex-col px-6 py-7 sm:px-10 lg:px-16"><div className="flex items-center justify-between"><div className="lg:hidden"><Brand /></div><Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#658078] transition hover:text-[#286a5d]"><ArrowLeft size={16} /> Wróć na stronę główną</Link></div>
      <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-14"><div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full bg-[#e9f4eb] px-4 py-2 text-xs font-bold tracking-wide text-[#4c8b68]"><LockKeyhole size={13} /> TWOJA PRYWATNA PRZESTRZEŃ</div><h2 className="font-display text-4xl leading-tight text-[#244b42] sm:text-5xl">{mode === "login" ? "Dobrze Cię widzieć." : "Zacznij od siebie."}</h2><p className="mt-4 text-sm leading-7 text-[#71867b]">{mode === "login" ? "Zaloguj się, aby wrócić do swojego dziennika." : "Utwórz konto i zacznij zapisywać swoje obserwacje."}</p>
        <div className="mt-9 grid grid-cols-2 rounded-2xl bg-[#ecf1eb] p-1.5"><button type="button" onClick={() => { setMode("login"); setError(""); setNotice(""); }} className={`rounded-xl py-3 text-sm font-semibold transition ${mode === "login" ? "bg-white text-[#27594b] shadow-sm" : "text-[#82978c]"}`}>Logowanie</button><button type="button" onClick={() => { setMode("register"); setError(""); setNotice(""); }} className={`rounded-xl py-3 text-sm font-semibold transition ${mode === "register" ? "bg-white text-[#27594b] shadow-sm" : "text-[#82978c]"}`}>Rejestracja</button></div>
        <form onSubmit={submit} className="mt-8 space-y-5"><div><label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#345d50]">Adres e-mail</label><input id="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="twoj@email.pl" className="field" /></div><div><label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#345d50]">Hasło</label><div className="relative"><input id="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} required value={password} onChange={event => setPassword(event.target.value)} placeholder="Minimum 6 znaków" className="field pr-12" /><button type="button" aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"} onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8aa196]"><span aria-hidden="true">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</span></button></div></div>
          {error && <p role="alert" className="rounded-xl border border-[#f2d7d3] bg-[#fff4f2] px-4 py-3 text-sm text-[#a34d43]">{error}</p>}{notice && <p role="status" className="rounded-xl border border-[#c9e4d4] bg-[#eef8f0] px-4 py-3 text-sm text-[#34694c]">{notice}</p>}
          <button disabled={busy} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#286a5d] px-5 py-4 text-sm font-bold text-white shadow-[0_9px_20px_rgba(38,106,93,.16)] transition hover:bg-[#1e594e] disabled:opacity-60">{busy ? "Chwila…" : mode === "login" ? "Zaloguj się" : "Utwórz konto"}<ArrowRight size={17} /></button>
        </form><p className="mt-8 text-center text-xs leading-6 text-[#96a99d]">Twoje wpisy są prywatne i dostępne wyłącznie na Twoim koncie.</p>
      </main>
    </div>
  </div>;
}
