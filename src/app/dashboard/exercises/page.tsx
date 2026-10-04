"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Activity, ArrowDown, BookOpenText, ChevronRight, CircleHelp, Heart, LogOut, Menu, Pencil, Plus, Printer, Save, Sparkles, Trash2, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { ARROW_EXAMPLE, MAX_ANSWER_LENGTH, MAX_ARROW_STEPS, MAX_SITUATION_LENGTH, MAX_WORKSHEET_LENGTH, arrowPrompt, normalizeArrowEntry, validateArrowDraft, type DownwardArrowEntry } from "@/lib/downward-arrow";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

function formatEntryDate(value: string) {
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

export default function ExercisesPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const formRef = useRef<HTMLElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(configured);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<DownwardArrowEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [situation, setSituation] = useState("");
  const [answers, setAnswers] = useState<string[]>([""]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const selectedEntries = useMemo(() => entries.filter(entry => selectedIds.includes(entry.id)), [entries, selectedIds]);
  const printPages = useMemo(() => {
    const pages: DownwardArrowEntry[][] = [];
    for (let index = 0; index < selectedEntries.length; index += 2) pages.push(selectedEntries.slice(index, index + 2));
    return pages;
  }, [selectedEntries]);
  const totalLength = situation.trim().length + answers.reduce((sum, answer) => sum + answer.trim().length, 0);

  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabase();
    let active = true;
    let currentUserId: string | null = null;

    void supabase.auth.getUser().then(async ({ data, error: authError }) => {
      if (!active) return;
      if (authError || !data.user) { router.replace("/auth"); return; }
      currentUserId = data.user.id;
      setUser(data.user);
      setChecking(false);
      const { data: rows, error: loadError } = await supabase.from("downward_arrow_exercises")
        .select("id,user_id,situation,answers,created_at,updated_at")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (loadError) setError("Nie udało się wczytać ćwiczeń. Uruchom plik supabase/downward_arrow.sql w Supabase SQL Editor.");
      else {
        const validEntries = (rows ?? []).map(normalizeArrowEntry).filter((entry): entry is DownwardArrowEntry => entry !== null);
        setEntries(validEntries);
        setSelectedIds(validEntries.map(entry => entry.id));
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (event === "SIGNED_IN" && currentUserId && session?.user.id !== currentUserId)) {
        setUser(null);
        setEntries([]);
        setSelectedIds([]);
        router.replace("/auth");
      }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [configured, router]);

  function resetForm() {
    setSituation("");
    setAnswers([""]);
    setEditingId(null);
    setFormError("");
  }

  function updateAnswer(index: number, value: string) {
    setAnswers(current => current.map((answer, answerIndex) => answerIndex === index ? value : answer));
  }

  function beginEdit(entry: DownwardArrowEntry) {
    setSituation(entry.situation);
    setAnswers([...entry.answers]);
    setEditingId(entry.id);
    setFormError("");
    setNotice("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || saving) return;
    const validationError = validateArrowDraft(situation, answers);
    if (validationError) { setFormError(validationError); return; }
    const cleanSituation = situation.trim();
    const cleanAnswers = answers.map(answer => answer.trim());
    setSaving(true);
    setFormError("");
    setError("");
    setNotice("");

    const supabase = getSupabase();
    const payload = { situation: cleanSituation, answers: cleanAnswers, updated_at: new Date().toISOString() };
    const result = editingId
      ? await supabase.from("downward_arrow_exercises").update(payload).eq("id", editingId).eq("user_id", user.id).select("id,user_id,situation,answers,created_at,updated_at").single()
      : await supabase.from("downward_arrow_exercises").insert({ ...payload, user_id: user.id }).select("id,user_id,situation,answers,created_at,updated_at").single();

    const saved = normalizeArrowEntry(result.data);
    if (result.error || !saved) setFormError("Nie udało się zapisać ćwiczenia. Sprawdź połączenie i skrypt SQL, a potem spróbuj ponownie.");
    else {
      setEntries(current => editingId
        ? current.map(entry => entry.id === saved.id ? saved : entry)
        : [saved, ...current]);
      setSelectedIds(current => current.includes(saved.id) ? current : [...current, saved.id]);
      setNotice(editingId ? "Zmiany zostały zapisane." : "Ćwiczenie zostało zapisane.");
      resetForm();
    }
    setSaving(false);
  }

  async function remove(entry: DownwardArrowEntry) {
    if (!user || !window.confirm("Usunąć to ćwiczenie? Tej czynności nie można cofnąć.")) return;
    setError("");
    setNotice("");
    const { error: deleteError } = await getSupabase().from("downward_arrow_exercises").delete()
      .eq("id", entry.id).eq("user_id", user.id);
    if (deleteError) setError("Nie udało się usunąć ćwiczenia. Spróbuj ponownie.");
    else {
      setEntries(current => current.filter(item => item.id !== entry.id));
      setSelectedIds(current => current.filter(id => id !== entry.id));
      if (editingId === entry.id) resetForm();
      setNotice("Ćwiczenie zostało usunięte.");
    }
  }

  async function signOut() {
    const { error: signOutError } = await getSupabase().auth.signOut({ scope: "local" });
    if (signOutError) setError("Nie udało się wylogować. Spróbuj ponownie.");
    else router.replace("/");
  }

  if (!configured) return <main className="grid min-h-screen place-items-center bg-[#f6f8f4] p-6"><div className="max-w-lg rounded-3xl border border-[#e1e9df] bg-white p-9"><Brand /><h1 className="font-display mt-7 text-3xl text-[#255146]">Skonfiguruj Supabase</h1><p className="mt-4 text-[#6b8176]">Uzupełnij .env.local zgodnie z README i uruchom skrypt supabase/downward_arrow.sql.</p></div></main>;
  if (checking || !user) return <div className="grid min-h-screen place-items-center bg-[#f6f8f4] text-sm text-[#668477]">Otwieranie ćwiczeń…</div>;

  return <>
    <div className="app-shell min-h-screen bg-[#f5f7f3] text-[#23483f] lg:flex">
      {menuOpen && <button type="button" aria-label="Zamknij menu" className="fixed inset-0 z-30 bg-[#183e36]/40 lg:hidden" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar fixed inset-y-0 left-0 z-40 flex w-[274px] flex-col bg-[#214f44] px-5 py-7 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2"><Brand light /><button type="button" className="lg:hidden" aria-label="Zamknij menu" onClick={() => setMenuOpen(false)}><X size={20} /></button></div>
        <p className="mb-4 mt-14 px-4 text-[11px] font-bold tracking-[.17em] text-[#94beaa] uppercase">Twoja przestrzeń</p>
        <nav aria-label="Nawigacja główna" className="space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-[#d0e2d7] transition hover:bg-white/10"><BookOpenText size={19} /> Dziennik Myśli CBT</Link>
          <Link href="/dashboard/activity" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-[#d0e2d7] transition hover:bg-white/10"><Activity size={19} /> Dziennik aktywności</Link>
          <Link href="/dashboard/exercises" aria-current="page" className="flex items-center gap-3 rounded-xl bg-white/15 px-4 py-3.5 text-sm font-semibold text-white"><Sparkles size={19} /> Ćwiczenia <ChevronRight className="ml-auto" size={16} /></Link>
          <button type="button" disabled className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm text-[#b9d0c5] opacity-70"><Heart size={19} /> Mapa emocji <span className="ml-auto text-[10px]">WKRÓTCE</span></button>
        </nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/8 p-5"><span className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-white/15"><CircleHelp size={19} /></span><p className="text-sm font-semibold">Możesz zatrzymać się na każdym kroku.</p><p className="mt-2 text-xs leading-5 text-[#b9d5c6]">To ćwiczenie pomaga zauważyć myśl. Nie musisz uznawać jej za prawdę.</p></div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="screen-only sticky top-0 z-20 flex items-center justify-between border-b border-[#e4ebe3] bg-[#f9fbf8]/95 px-5 py-4 backdrop-blur sm:px-8 lg:px-12"><div className="flex items-center gap-3"><button type="button" aria-label="Otwórz menu" className="rounded-lg p-2 lg:hidden" onClick={() => setMenuOpen(true)}><Menu size={22} /></button><span className="text-sm font-medium text-[#789084]">Twoja przestrzeń</span><ChevronRight size={15} className="text-[#acbdb2]" /><span className="text-sm font-bold text-[#285a4b]">Ćwiczenia</span></div><div className="flex items-center gap-3 sm:gap-5"><span className="hidden max-w-52 truncate text-sm text-[#557266] sm:inline">{user.email}</span><span className="grid h-9 w-9 place-items-center rounded-full bg-[#dceee1] text-sm font-bold text-[#3a7860]">{user.email?.charAt(0).toUpperCase()}</span><button type="button" onClick={signOut} className="inline-flex items-center gap-2 text-sm font-semibold text-[#607e70] hover:text-[#1d594b]" aria-label="Wyloguj"><LogOut size={18} /><span className="hidden md:inline">Wyloguj</span></button></div></header>
        <main className="mx-auto max-w-[1190px] px-5 pb-20 pt-10 sm:px-8 lg:px-12 lg:pt-12">
          <div className="mb-8"><div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-[.15em] text-[#65a184] uppercase"><span className="h-2 w-2 rounded-full bg-[#72ae8b]" /> Ćwiczenia CBT</div><h1 className="font-display text-4xl leading-tight text-[#204a3e] sm:text-5xl">Strzałka w dół</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[#73897d]">Dochodzenie do przekonań kluczowych. Zacznij od sytuacji, która wywołała silne emocje, i sprawdź, jaka myśl kryje się pod kolejną. To zapis myśli do przyjrzenia się im, nie stwierdzenie faktów.</p></div>
          {error && <p role="alert" className="mb-5 rounded-xl border border-[#eed2cd] bg-[#fff5f2] px-5 py-4 text-sm text-[#a45848]">{error}</p>}
          {notice && <p role="status" className="mb-5 rounded-xl border border-[#cde6d3] bg-[#f0f8f0] px-5 py-4 text-sm text-[#387457]">{notice}</p>}
          <details className="mb-7 rounded-2xl border border-[#dfe9de] bg-[#f9fcf8] px-5 py-4 text-sm text-[#567261]"><summary className="cursor-pointer font-bold text-[#3c7057]">Zobacz przykład krok po kroku</summary><div className="mt-4 border-t border-[#e2ebe0] pt-4"><p className="mb-3"><strong>Sytuacja:</strong> {ARROW_EXAMPLE.situation}</p>{ARROW_EXAMPLE.answers.map((answer, index) => <div key={index} className="mb-2 pl-4"><p className="text-xs font-bold text-[#75a486]">↓ {arrowPrompt(index)}</p><p className="mt-1">{answer}</p></div>)}</div></details>

          <section ref={formRef} className="scroll-mt-24 rounded-[26px] border border-[#e0e9de] bg-white shadow-[0_10px_35px_rgba(35,74,52,.045)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1ec] px-6 py-6 sm:px-9"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e9f5eb] text-[#44866c]"><ArrowDown size={22} /></span><div><h2 className="text-lg font-bold text-[#2b5649]">{editingId ? "Edytuj ćwiczenie" : "Nowe ćwiczenie"}</h2><p className="text-xs text-[#8da196]">Idź tak głęboko, jak czujesz się gotowa/y</p></div></div><span className="rounded-full bg-[#f0f7ef] px-3 py-1.5 text-[11px] font-semibold text-[#5d9872]">PRYWATNY ZAPIS</span></div>
            <form onSubmit={save} className="px-6 py-8 sm:px-9">
              <div><label htmlFor="arrow-situation" className="field-label"><span className="step">1</span> Sytuacja, która wywołała silne emocje</label><p className="field-help">Co dokładnie się wydarzyło? Opisz jeden konkretny moment.</p><textarea id="arrow-situation" required maxLength={MAX_SITUATION_LENGTH} rows={3} className="field resize-y" placeholder={ARROW_EXAMPLE.situation} value={situation} onChange={event => setSituation(event.target.value)} /></div>
              <div className="mt-8 space-y-2">{answers.map((answer, index) => <div key={index} className="arrow-step-editor"><span className="arrow-step-line"><ArrowDown size={18} /></span><div className="flex flex-wrap items-start justify-between gap-3"><label htmlFor={`arrow-answer-${index}`} className="field-label mb-0"><span className="step">{index + 2}</span> {arrowPrompt(index)}</label>{answers.length > 1 && <button type="button" onClick={() => setAnswers(current => current.filter((_, answerIndex) => answerIndex !== index))} className="inline-flex items-center gap-1 text-xs font-semibold text-[#ad6c62] hover:text-[#8f4d43]" aria-label={`Usuń krok ${index + 1}`}><X size={14} /> Usuń krok</button>}</div><p className="field-help !ml-[35px]">{index === 0 ? "Jaka myśl pojawiła się jako pierwsza?" : "Co mogłoby znaczyć dla Ciebie, gdyby poprzednia myśl była prawdziwa?"}</p><textarea id={`arrow-answer-${index}`} required maxLength={MAX_ANSWER_LENGTH} rows={2} className="field resize-y" placeholder={ARROW_EXAMPLE.answers[index] ?? "Zapisz kolejną myśl…"} value={answer} onChange={event => updateAnswer(index, event.target.value)} /></div>)}</div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={answers.length >= MAX_ARROW_STEPS} onClick={() => setAnswers(current => [...current, ""])} className="inline-flex items-center gap-2 rounded-xl border border-[#cce1d0] bg-[#f2f9f2] px-4 py-2.5 text-sm font-bold text-[#36765a] hover:bg-[#e7f4e9] disabled:opacity-45"><Plus size={17} /> Dodaj kolejną strzałkę</button><span className="text-xs text-[#8ba092]">{answers.length}/{MAX_ARROW_STEPS} kroków · {totalLength}/{MAX_WORKSHEET_LENGTH} znaków</span></div>
              {formError && <p role="alert" className="mt-5 rounded-xl border border-[#eed2cd] bg-[#fff5f2] px-4 py-3 text-sm text-[#a45848]">{formError}</p>}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#edf1ec] pt-6"><p className="text-xs leading-5 text-[#90a397]">Możesz wrócić do tego ćwiczenia i zmienić odpowiedzi później.</p><div className="flex gap-3">{editingId && <button type="button" onClick={resetForm} className="rounded-xl border border-[#dce7dc] px-5 py-3 text-sm font-semibold text-[#6e8977]">Anuluj</button>}<button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#2e765e] px-6 py-3 text-sm font-bold text-white hover:bg-[#25674f] disabled:opacity-60"><Save size={17} /> {saving ? "Zapisywanie…" : editingId ? "Zapisz zmiany" : "Zapisz ćwiczenie"}</button></div></div>
            </form>
          </section>

          <section className="mt-12" aria-label="Zapisane ćwiczenia"><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold tracking-[.15em] text-[#69a486] uppercase">Twoje ćwiczenia</p><h2 className="font-display text-3xl text-[#275345] sm:text-4xl">Zapisane strzałki <span className="font-sans text-base font-semibold text-[#8baa96]">({entries.length})</span></h2></div><button type="button" disabled={!selectedEntries.length || loading} onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-[#bdd5c4] bg-white px-5 py-3 text-sm font-bold text-[#397457] hover:bg-[#edf7ed] disabled:opacity-50"><Printer size={17} /> Drukuj zaznaczone ({selectedEntries.length})</button></div><p className="mb-5 text-xs leading-5 text-[#869b8b]">Zaznacz ćwiczenia do wydruku. Dwa pojawią się obok siebie na poziomej kartce A4; przy nieparzystej liczbie ostatnie zajmie jej połowę.</p>
            {loading ? <div className="rounded-2xl border border-[#e1e9df] bg-white p-10 text-center text-sm text-[#84998c]">Wczytywanie ćwiczeń…</div> : entries.length === 0 ? <div className="rounded-[24px] border border-dashed border-[#cbdccc] bg-white px-6 py-12 text-center"><Sparkles className="mx-auto mb-4 text-[#6a9d78]" size={28} /><h3 className="text-lg font-bold text-[#3e6d54]">Tu pojawią się Twoje ćwiczenia</h3><p className="mt-2 text-sm text-[#82968a]">Zapisz pierwszą strzałkę w dół powyżej.</p></div> : <div className="grid gap-4 md:grid-cols-2">{entries.map(entry => <article key={entry.id} className="rounded-[22px] border border-[#dfe9de] bg-white p-5 shadow-[0_5px_18px_rgba(36,74,52,.025)]"><div className="mb-4 flex items-center justify-between gap-4"><label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-[#4d8061]"><input type="checkbox" checked={selectedIds.includes(entry.id)} onChange={() => setSelectedIds(current => current.includes(entry.id) ? current.filter(id => id !== entry.id) : [...current, entry.id])} className="h-4 w-4 accent-[#328264]" /> Do wydruku</label><time dateTime={entry.created_at} className="text-xs text-[#92a69a]">{formatEntryDate(entry.created_at)}</time></div><p className="text-xs font-bold tracking-wide text-[#78a387] uppercase">Sytuacja</p><p className="mt-1 line-clamp-3 text-sm leading-6 text-[#3d6450]">{entry.situation}</p><div className="mt-4 border-l-2 border-[#b8d8c0] pl-3"><p className="text-xs font-semibold text-[#82a48c]">Ostatnia odpowiedź · {entry.answers.length} {entry.answers.length === 1 ? "krok" : "kroków"}</p><p className="mt-1 line-clamp-3 text-sm font-semibold leading-6 text-[#2e6a50]">{entry.answers.at(-1)}</p></div><details className="mt-4 rounded-xl bg-[#f7faf6] px-4 py-3"><summary className="cursor-pointer text-xs font-bold text-[#4e8063]">Pokaż cały ciąg myśli</summary><ol className="mt-3 space-y-3">{entry.answers.map((answer, index) => <li key={index}><p className="text-xs font-bold text-[#80a68b]">↓ {arrowPrompt(index)}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-[#426652]">{answer}</p></li>)}</ol></details><div className="mt-5 flex gap-2 border-t border-[#eef2ec] pt-4"><button type="button" onClick={() => beginEdit(entry)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#d8e7da] px-3 py-2 text-xs font-bold text-[#4c8263] hover:bg-[#eaf5eb]"><Pencil size={14} /> Edytuj</button><button type="button" onClick={() => remove(entry)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#eedad6] px-3 py-2 text-xs font-bold text-[#b96e65] hover:bg-[#fff2f0]"><Trash2 size={14} /> Usuń</button></div></article>)}</div>}
          </section>
          <p className="mt-10 text-center text-xs leading-6 text-[#97a99c]">Ćwiczenie wspiera refleksję i pracę na terapii. Nie zastępuje kontaktu ze specjalistą.</p>
        </main>
      </div>
    </div>
    <section className="arrow-print" aria-label="Ćwiczenia Strzałka w dół do wydruku">{printPages.map((page, pageIndex) => <div className="arrow-print-page" key={pageIndex}>{page.map(entry => <PrintArrowCard key={entry.id} entry={entry} />)}</div>)}</section>
  </>;
}

function PrintArrowCard({ entry }: { entry: DownwardArrowEntry }) {
  const dense = entry.situation.length + entry.answers.join("").length > 950;
  return <article className={`arrow-print-card ${dense ? "arrow-print-card-dense" : ""}`}><header><p className="arrow-print-eyebrow">Ćwiczenie CBT · {formatEntryDate(entry.created_at)}</p><h2>Strzałka w dół</h2><p>Dochodzenie do przekonań kluczowych</p></header><div className="arrow-print-situation"><h3>Sytuacja, która wywołała silne emocje</h3><p>{entry.situation}</p></div><ol className="arrow-print-steps">{entry.answers.map((answer, index) => <li key={index}><span className="arrow-print-arrow">↓</span><div><h3>{arrowPrompt(index)}</h3><p>{answer}</p></div></li>)}</ol></article>;
}
