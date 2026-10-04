"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Activity, ArrowDown, BookOpenText, CalendarDays, ChevronRight, CircleHelp, Heart, History, LogOut, Menu, NotebookPen, Pencil, Plus, Printer, Save, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { DISTORTIONS, dateTimeLocalNow, entriesForDateRange, formatDate, normalizeDistortion, type DateOrder, type Emotion, type JournalEntry } from "@/lib/journal";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

type Draft = { occurred_at: string; situation: string; automatic_thought: string; body_sensations: string; emotions: Emotion[]; behavior: string; distortions: string[] };
const blankDraft = (): Draft => ({ occurred_at: dateTimeLocalNow(), situation: "", automatic_thought: "", body_sensations: "", emotions: [{ name: "", intensity: 50 }], behavior: "", distortions: [] });

export default function DashboardPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(configured);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [fromDay, setFromDay] = useState("");
  const [toDay, setToDay] = useState("");
  const [dateOrder, setDateOrder] = useState<DateOrder>("newest");
  const formRef = useRef<HTMLElement>(null);
  const historyRef = useRef<HTMLElement>(null);
  const invalidDateRange = Boolean(fromDay && toDay && fromDay > toDay);
  const visibleEntries = useMemo(() => entriesForDateRange(entries, fromDay, toDay, dateOrder), [entries, fromDay, toDay, dateOrder]);

  const loadEntries = useCallback(async (userId: string) => {
    setLoadingEntries(true);
    const { data, error: queryError } = await getSupabase().from("cbt_entries").select("id,user_id,occurred_at,situation,automatic_thought,body_sensations,emotions,behavior,distortions,created_at").eq("user_id", userId).order("occurred_at", { ascending: false });
    if (queryError) setError("Nie udało się pobrać wpisów. Sprawdź konfigurację bazy danych i spróbuj odświeżyć stronę.");
    else setEntries(((data ?? []) as JournalEntry[]).map(entry => ({ ...entry, distortions: entry.distortions.map(normalizeDistortion) })));
    setLoadingEntries(false);
  }, []);

  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabase();
    let active = true;
    void supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!active) return;
      if (authError || !data.user) { router.replace("/auth"); return; }
      setUser(data.user); setChecking(false); void loadEntries(data.user.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") { setEntries([]); setUser(null); router.replace("/auth"); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [configured, loadEntries, router]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft(current => ({ ...current, [key]: value })); }
  function updateEmotion(index: number, key: keyof Emotion, value: string | number) { setDraft(current => ({ ...current, emotions: current.emotions.map((emotion, itemIndex) => itemIndex === index ? { ...emotion, [key]: value } : emotion) })); }
  function toggleDistortion(item: string) { setDraft(current => ({ ...current, distortions: current.distortions.includes(item) ? current.distortions.filter(value => value !== item) : [...current.distortions, item] })); }
  function resetForm() { setDraft(blankDraft()); setEditingId(null); setError(""); }
  function startEdit(entry: JournalEntry) { setDraft({ occurred_at: new Date(new Date(entry.occurred_at).getTime() - new Date(entry.occurred_at).getTimezoneOffset() * 60_000).toISOString().slice(0, 16), situation: entry.situation, automatic_thought: entry.automatic_thought, body_sensations: entry.body_sensations, emotions: entry.emotions.length ? entry.emotions : [{ name: "", intensity: 50 }], behavior: entry.behavior, distortions: entry.distortions }); setEditingId(entry.id); setError(""); setSuccess(""); formRef.current?.scrollIntoView({ behavior: "smooth" }); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    if (!user) return;
    const emotions = draft.emotions.map(item => ({ name: item.name.trim(), intensity: Number(item.intensity) }));
    if (emotions.some(item => !item.name || !Number.isInteger(item.intensity) || item.intensity < 0 || item.intensity > 100)) { setError("Dodaj nazwę każdej emocji i określ jej siłę od 0 do 100%."); return; }
    const occurredAt = new Date(draft.occurred_at);
    if (Number.isNaN(occurredAt.getTime())) { setError("Wybierz poprawną datę i godzinę."); return; }
    setSaving(true);
    const payload = { user_id: user.id, occurred_at: occurredAt.toISOString(), situation: draft.situation.trim(), automatic_thought: draft.automatic_thought.trim(), body_sensations: draft.body_sensations.trim(), emotions, behavior: draft.behavior.trim(), distortions: draft.distortions };
    const supabase = getSupabase();
    const result = editingId ? await supabase.from("cbt_entries").update(payload).eq("id", editingId).eq("user_id", user.id) : await supabase.from("cbt_entries").insert(payload);
    if (result.error) setError(`Nie udało się zapisać wpisu: ${result.error.message}`);
    else { setSuccess(editingId ? "Wpis został zaktualizowany." : "Wpis został zapisany. Możesz do niego wrócić w historii."); setDraft(blankDraft()); setEditingId(null); await loadEntries(user.id); }
    setSaving(false);
  }

  async function remove(entry: JournalEntry) {
    if (!user || !window.confirm("Usunąć ten wpis? Tej czynności nie można cofnąć.")) return;
    setError(""); setSuccess("");
    const { error: deleteError } = await getSupabase().from("cbt_entries").delete().eq("id", entry.id).eq("user_id", user.id);
    if (deleteError) setError("Nie udało się usunąć wpisu. Spróbuj ponownie.");
    else { setEntries(current => current.filter(item => item.id !== entry.id)); if (editingId === entry.id) resetForm(); setSuccess("Wpis został usunięty."); }
  }

  async function signOut() { const { error: signOutError } = await getSupabase().auth.signOut({ scope: "local" }); if (signOutError) setError("Nie udało się wylogować. Spróbuj ponownie."); else router.replace("/"); }

  if (!configured) return <main className="grid min-h-screen place-items-center bg-[#f6f8f4] p-6"><div className="max-w-lg rounded-3xl border border-[#e1e9df] bg-white p-9 shadow-sm"><Brand /><h1 className="font-display mt-8 text-3xl text-[#255146]">Skonfiguruj Supabase</h1><p className="mt-4 leading-7 text-[#6b8176]">Dodaj <code>NEXT_PUBLIC_SUPABASE_URL</code> i <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> do pliku <code>.env.local</code>, a następnie uruchom skrypt <code>supabase/schema.sql</code> w Supabase SQL Editor. Szczegóły znajdziesz w README.</p></div></main>;
  if (checking || !user) return <div className="grid min-h-screen place-items-center bg-[#f6f8f4] text-sm text-[#668477]">Otwieranie Twojego dziennika…</div>;

  return <>
    <div className="app-shell min-h-screen bg-[#f5f7f3] text-[#23483f] lg:flex">
      {menuOpen && <button type="button" aria-label="Zamknij menu" className="fixed inset-0 z-30 bg-[#183e36]/40 lg:hidden" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar fixed inset-y-0 left-0 z-40 flex w-[274px] flex-col bg-[#214f44] px-5 py-7 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2"><Brand light /><button type="button" className="lg:hidden" aria-label="Zamknij menu" onClick={() => setMenuOpen(false)}><X size={20} /></button></div>
        <p className="mb-4 mt-14 px-4 text-[11px] font-bold tracking-[.17em] text-[#94beaa] uppercase">Twoja przestrzeń</p>
        <nav aria-label="Nawigacja główna" className="space-y-2"><button type="button" onClick={() => { formRef.current?.scrollIntoView({ behavior: "smooth" }); setMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-xl bg-white/15 px-4 py-3.5 text-left text-sm font-semibold text-white"><BookOpenText size={19} /> Dziennik Myśli CBT <ChevronRight className="ml-auto" size={16} /></button><Link href="/dashboard/activity" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-[#d0e2d7] transition hover:bg-white/10"><Activity size={19} /> Dziennik aktywności</Link><button type="button" disabled className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm text-[#b9d0c5] opacity-70"><Heart size={19} /> Mapa emocji <span className="ml-auto text-[10px]">WKRÓTCE</span></button><button type="button" disabled className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm text-[#b9d0c5] opacity-70"><Sparkles size={19} /> Ćwiczenia <span className="ml-auto text-[10px]">WKRÓTCE</span></button></nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/8 p-5"><span className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-white/15"><CircleHelp size={19} /></span><p className="text-sm font-semibold">Mały krok też jest krokiem.</p><p className="mt-2 text-xs leading-5 text-[#b9d5c6]">Wracaj do dziennika wtedy, kiedy tego potrzebujesz.</p></div><p className="mt-6 px-3 text-[11px] text-[#9fbeb0]">Twój Pomocnik w Terapii</p>
      </aside>
      <div className="min-w-0 flex-1"><header className="screen-only sticky top-0 z-20 flex items-center justify-between border-b border-[#e4ebe3] bg-[#f9fbf8]/95 px-5 py-4 backdrop-blur sm:px-8 lg:px-12"><div className="flex items-center gap-3"><button type="button" aria-label="Otwórz menu" className="rounded-lg p-2 lg:hidden" onClick={() => setMenuOpen(true)}><Menu size={22} /></button><span className="text-sm font-medium text-[#789084]">Twoja przestrzeń</span><ChevronRight size={15} className="text-[#acbdb2]" /><span className="text-sm font-bold text-[#285a4b]">Dziennik myśli</span></div><div className="flex items-center gap-3 sm:gap-5"><span className="hidden max-w-52 truncate text-sm text-[#557266] sm:inline">{user.email}</span><span className="grid h-9 w-9 place-items-center rounded-full bg-[#dceee1] text-sm font-bold text-[#3a7860]">{user.email?.charAt(0).toUpperCase()}</span><button type="button" onClick={signOut} className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-[#607e70] transition hover:text-[#1d594b]" aria-label="Wyloguj"><LogOut size={18} /><span className="hidden md:inline">Wyloguj</span></button></div></header>
        <main className="dashboard-main mx-auto max-w-[1190px] px-5 pb-24 pt-10 sm:px-8 lg:px-12 lg:pt-12"><div className="screen-only mb-9 flex flex-wrap items-end justify-between gap-5"><div><div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-[.15em] text-[#65a184] uppercase"><span className="h-2 w-2 rounded-full bg-[#72ae8b]" /> Twoja codzienna przestrzeń</div><h1 className="font-display text-4xl leading-tight text-[#204a3e] sm:text-5xl">Dziennik myśli CBT</h1><p className="mt-3 text-sm leading-6 text-[#73897d]">Zatrzymaj chwilę. Nazwij to, co się wydarzyło, i przyjrzyj się swoim myślom.</p></div><button type="button" onClick={() => historyRef.current?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center gap-2 rounded-xl border border-[#d7e5d9] bg-white px-4 py-3 text-sm font-semibold text-[#44725d] hover:bg-[#f0f7f0]"><History size={17} /> Zobacz historię <ArrowDown size={15} /></button></div>
          <div className="screen-only mb-8 grid gap-4 sm:grid-cols-3"><div className="stat-card"><span className="stat-icon bg-[#e6f4e9] text-[#57966f]"><NotebookPen size={20} /></span><div><p className="text-xs text-[#81958a]">Zapisane refleksje</p><p className="mt-1 text-2xl font-bold text-[#315e4a]">{entries.length}</p></div></div><div className="stat-card"><span className="stat-icon bg-[#f7eee3] text-[#b89061]"><CalendarDays size={20} /></span><div><p className="text-xs text-[#81958a]">Dzisiaj</p><p className="mt-1 text-sm font-bold text-[#315e4a]">{new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long" }).format(new Date())}</p></div></div><div className="stat-card"><span className="stat-icon bg-[#e8f0f5] text-[#7199ad]"><ShieldCheck size={20} /></span><div><p className="text-xs text-[#81958a]">Prywatność</p><p className="mt-1 text-sm font-bold text-[#315e4a]">Tylko Twoje wpisy</p></div></div></div>
          {error && <div role="alert" className="screen-only mb-6 rounded-xl border border-[#eed2cd] bg-[#fff5f2] px-5 py-4 text-sm text-[#a45848]">{error}</div>}{success && <div role="status" className="screen-only mb-6 rounded-xl border border-[#cde6d3] bg-[#f0f8f0] px-5 py-4 text-sm text-[#387457]">{success}</div>}
          <section ref={formRef} className="screen-only rounded-[26px] border border-[#e0e9de] bg-white shadow-[0_10px_35px_rgba(35,74,52,.045)]"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1ec] px-6 py-6 sm:px-9"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e9f5eb] text-[#44866c]"><Plus size={22} /></span><div><h2 className="text-lg font-bold text-[#2b5649]">{editingId ? "Edytuj wpis" : "Nowy wpis do dziennika"}</h2><p className="text-xs text-[#8da196]">Daj sobie przestrzeń na szczerą refleksję</p></div></div><span className="rounded-full bg-[#f0f7ef] px-3 py-1.5 text-[11px] font-semibold text-[#5d9872]">PRYWATNY ZAPIS</span></div>
            <form onSubmit={save} className="space-y-8 px-6 py-8 sm:px-9"><div><label htmlFor="occurred_at" className="field-label"><span className="step">•</span> Data i czas</label><div className="relative max-w-xs"><input id="occurred_at" type="datetime-local" required className="field" value={draft.occurred_at} onChange={event => update("occurred_at", event.target.value)} /></div></div>
              <div><label htmlFor="situation" className="field-label"><span className="step">1</span> Sytuacja</label><p className="field-help">Co się wydarzyło? Kto, gdzie, kiedy?</p><textarea id="situation" required maxLength={5000} rows={3} className="field resize-y" placeholder="Opisz konkretną sytuację..." value={draft.situation} onChange={event => update("situation", event.target.value)} /></div>
              <div><label htmlFor="automatic_thought" className="field-label"><span className="step">2</span> Pierwsza myśl</label><p className="field-help">Co automatycznie pojawiło się w głowie?</p><textarea id="automatic_thought" required maxLength={5000} rows={3} className="field resize-y" placeholder="Jaka była Twoja pierwsza myśl?" value={draft.automatic_thought} onChange={event => update("automatic_thought", event.target.value)} /></div>
              <div><label htmlFor="body_sensations" className="field-label"><span className="step">3</span> Co poczułem w ciele i emocje</label><p className="field-help">Opisz reakcje ciała, a poniżej dodaj emocje i ich siłę w skali 0–100%.</p><textarea id="body_sensations" required maxLength={5000} rows={3} className="field resize-y" placeholder="Np. napięcie w ramionach, przyspieszony oddech..." value={draft.body_sensations} onChange={event => update("body_sensations", event.target.value)} /><div className="mt-4 space-y-3">{draft.emotions.map((emotion, index) => <div key={index} className="flex flex-wrap items-end gap-3 rounded-xl bg-[#f7faf6] p-3 sm:flex-nowrap"><div className="min-w-[140px] flex-1"><label htmlFor={`emotion-${index}`} className="mb-1.5 block text-xs font-semibold text-[#6e8a78]">Emocja {index + 1}</label><input id={`emotion-${index}`} className="field !bg-white" maxLength={80} placeholder="Np. smutek" value={emotion.name} onChange={event => updateEmotion(index, "name", event.target.value)} /></div><div className="w-28"><label htmlFor={`intensity-${index}`} className="mb-1.5 block text-xs font-semibold text-[#6e8a78]">Siła (0–100%)</label><input id={`intensity-${index}`} type="number" min="0" max="100" step="1" className="field !bg-white" value={emotion.intensity} onChange={event => updateEmotion(index, "intensity", Number(event.target.value))} /></div><button type="button" aria-label={`Usuń emocję ${index + 1}`} disabled={draft.emotions.length === 1} onClick={() => update("emotions", draft.emotions.filter((_, itemIndex) => itemIndex !== index))} className="mb-1 grid h-10 w-10 place-items-center rounded-lg text-[#95aa9c] hover:bg-[#fceceb] hover:text-[#a45d52] disabled:opacity-30"><X size={18} /></button></div>)}</div><button type="button" onClick={() => update("emotions", [...draft.emotions, { name: "", intensity: 50 }])} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#398568] hover:text-[#24664f]"><Plus size={16} /> Dodaj emocję</button></div>
              <div><label htmlFor="behavior" className="field-label"><span className="step">4</span> Co zrobiłem w dalszej kolejności</label><p className="field-help">Opisz zachowanie, reakcję lub podjęte działania.</p><textarea id="behavior" required maxLength={5000} rows={3} className="field resize-y" placeholder="Jak zareagowałeś/aś? Co zrobiłeś/aś potem?" value={draft.behavior} onChange={event => update("behavior", event.target.value)} /></div>
              <fieldset><legend className="field-label"><span className="step">5</span> Zniekształcenia poznawcze</legend><p className="field-help">Zaznacz te wzorce, które rozpoznajesz w swojej myśli. Możesz wybrać kilka.</p><div className="grid gap-2 sm:grid-cols-2">{DISTORTIONS.map(item => <label key={item} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-5 transition ${draft.distortions.includes(item) ? "border-[#a9d3b6] bg-[#eef8ef] text-[#2f7255]" : "border-[#e3ebe2] bg-white text-[#607b6b] hover:border-[#bbd9c3]"}`}><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#328264]" checked={draft.distortions.includes(item)} onChange={() => toggleDistortion(item)} />{item}</label>)}</div></fieldset>
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#edf1ec] pt-7"><p className="flex items-center gap-2 text-xs text-[#94a79a]"><LockIcon /> Wpis będzie widoczny tylko dla Ciebie</p><div className="flex gap-3">{editingId && <button type="button" onClick={resetForm} className="rounded-xl border border-[#dce7dc] px-5 py-3 text-sm font-semibold text-[#6e8977]">Anuluj</button>}<button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#2e765e] px-6 py-3 text-sm font-bold text-white shadow-[0_9px_18px_rgba(41,111,83,.16)] transition hover:bg-[#25674f] disabled:opacity-60"><Save size={17} /> {saving ? "Zapisywanie…" : editingId ? "Zapisz zmiany" : "Zapisz wpis"}</button></div></div>
            </form>
          </section>
          <section ref={historyRef} className="screen-only mt-12 scroll-mt-24">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div><div className="mb-2 text-xs font-bold tracking-[.15em] text-[#69a486] uppercase">Twoja historia</div><h2 className="font-display text-3xl text-[#275345] sm:text-4xl">Zapisane wpisy <span className="font-sans text-base font-semibold text-[#8baa96]">({fromDay || toDay ? `${visibleEntries.length} z ${entries.length}` : entries.length})</span></h2></div>
              <button type="button" disabled={loadingEntries || !visibleEntries.length || invalidDateRange} onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-[#bdd5c4] bg-white px-5 py-3 text-sm font-bold text-[#397457] transition hover:bg-[#edf7ed] disabled:cursor-not-allowed disabled:opacity-50"><Printer size={17} /> Drukuj wpisy na sesję</button>
            </div>
            <div className="mb-5 flex flex-wrap items-end gap-4 rounded-2xl border border-[#dfe9df] bg-white p-5 shadow-[0_5px_18px_rgba(36,74,52,.025)]">
              <div className="min-w-[155px] flex-1"><label htmlFor="entries-from" className="mb-2 block text-xs font-bold text-[#567864]">Od dnia</label><input id="entries-from" type="date" value={fromDay} onChange={event => setFromDay(event.target.value)} className="field !bg-white" /></div>
              <div className="min-w-[155px] flex-1"><label htmlFor="entries-to" className="mb-2 block text-xs font-bold text-[#567864]">Do dnia</label><input id="entries-to" type="date" value={toDay} onChange={event => setToDay(event.target.value)} className="field !bg-white" /></div>
              <div className="min-w-[195px] flex-1"><label htmlFor="entries-order" className="mb-2 block text-xs font-bold text-[#567864]">Kolejność dat</label><select id="entries-order" value={dateOrder} onChange={event => setDateOrder(event.target.value as DateOrder)} className="field !bg-white"><option value="newest">Od najnowszych</option><option value="oldest">Od najstarszych</option></select></div>
              <button type="button" disabled={!fromDay && !toDay && dateOrder === "newest"} onClick={() => { setFromDay(""); setToDay(""); setDateOrder("newest"); }} className="rounded-xl border border-[#dce7dc] px-4 py-3.5 text-sm font-semibold text-[#5b8068] transition hover:bg-[#f1f8f1] disabled:opacity-45">Wyczyść</button>
              <p className="w-full text-xs text-[#88a08f]">Zakres obejmuje całe dni. Wydruk pokaże tylko wpisy widoczne w tabeli, w tej samej kolejności.</p>
            </div>
            {loadingEntries ? <div className="rounded-2xl border border-[#e1e9df] bg-white p-10 text-center text-sm text-[#84998c]">Wczytywanie wpisów…</div> : entries.length === 0 ? <div className="rounded-[24px] border border-dashed border-[#cbdccc] bg-white px-6 py-14 text-center"><span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#eff6ee] text-[#6a9d78]"><BookOpenText size={26} /></span><h3 className="text-lg font-bold text-[#3e6d54]">Tu pojawią się Twoje wpisy</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#82968a]">Wypełnij pierwszy zapis powyżej. Każda obserwacja pomaga lepiej rozumieć własne reakcje.</p></div> : invalidDateRange ? <div role="alert" className="rounded-2xl border border-[#eedad6] bg-[#fff7f4] p-8 text-center text-sm text-[#a45848]">Data „Od dnia” nie może być późniejsza niż data „Do dnia”.</div> : visibleEntries.length === 0 ? <div className="rounded-2xl border border-[#e1e9df] bg-white p-10 text-center text-sm text-[#789080]">Brak wpisów w wybranym zakresie dni.</div> : <div className="journal-table-scroll" role="region" aria-label="Tabela zapisanych wpisów" tabIndex={0}><JournalTable entries={visibleEntries} onEdit={startEdit} onDelete={remove} /></div>}
          </section>
          <p className="screen-only mt-10 text-center text-xs leading-6 text-[#97a99c]">Dziennik wspiera refleksję i pracę na terapii. Nie zastępuje kontaktu ze specjalistą.</p>
        </main>
      </div>
    </div>
    <section className="print-sheet" aria-label="Wpisy do wydruku">
      <h1>Zapis sytuacji, myśli, emocji</h1>
      <JournalTable entries={visibleEntries} />
    </section>
  </>;
}

function JournalTable({ entries, onEdit, onDelete }: {
  entries: JournalEntry[];
  onEdit?: (entry: JournalEntry) => void;
  onDelete?: (entry: JournalEntry) => void;
}) {
  return <table className="journal-table print-table">
    <colgroup><col className="print-col-date" /><col className="print-col-situation" /><col className="print-col-thought" /><col className="print-col-feelings" /><col className="print-col-intensity" /><col className="print-col-behavior" /><col className="print-col-distortions" /></colgroup>
    <thead><tr><th scope="col">Data</th><th scope="col">Sytuacja</th><th scope="col">Co pomyślałam/łem?</th><th scope="col">Co czułam/łem w tej sytuacji?</th><th scope="col">Siła emocji</th><th scope="col">Co zrobiłam/łem później?</th><th scope="col">Zniekształcenia poznawcze</th></tr></thead>
    <tbody>{entries.map(entry => <tr key={entry.id}>
      <td><time dateTime={entry.occurred_at}>{formatDate(entry.occurred_at)}</time>{onEdit && onDelete && <div className="journal-row-actions"><button type="button" onClick={() => onEdit(entry)} aria-label={`Edytuj wpis z ${formatDate(entry.occurred_at)}`}><Pencil size={14} /> Edytuj</button><button type="button" onClick={() => onDelete(entry)} aria-label={`Usuń wpis z ${formatDate(entry.occurred_at)}`}><Trash2 size={14} /></button></div>}</td>
      <td>{entry.situation}</td>
      <td>{entry.automatic_thought}</td>
      <td>{entry.body_sensations}<br />{entry.emotions.map(emotion => emotion.name).join(", ")}</td>
      <td>{entry.emotions.map(emotion => `${emotion.name}: ${emotion.intensity}%`).join(",\n")}</td>
      <td>{entry.behavior}</td>
      <td>{entry.distortions.length ? entry.distortions.join(", ") : "—"}</td>
    </tr>)}</tbody>
  </table>;
}

function LockIcon() { return <ShieldCheck size={15} />; }
