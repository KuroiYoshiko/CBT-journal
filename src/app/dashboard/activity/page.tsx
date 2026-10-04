"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Activity, BookOpenText, CalendarDays, Check, ChevronLeft, ChevronRight, CircleHelp, Heart, LogOut, Menu, Printer, Save, Sparkles, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { ACTIVITY_SLOTS, WEEKDAYS, activityKey, dateKey, formatDay, weekFor, weekOffsetForToday, type ActivityEntry } from "@/lib/activity";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

type SelectedCell = { date: string; slotIndex: number };
type Week = ReturnType<typeof weekFor>;

export default function ActivityPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(configured);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [setupDate, setSetupDate] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [activityDraft, setActivityDraft] = useState("");
  const [moodDraft, setMoodDraft] = useState("");
  const [savingCell, setSavingCell] = useState(false);
  const [cellError, setCellError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const week = useMemo(() => startDate ? weekFor(startDate, weekOffset) : null, [startDate, weekOffset]);
  const entryMap = useMemo(() => new Map<string, ActivityEntry>(entries.map(entry => [activityKey(entry.activity_date, entry.slot_index), entry])), [entries]);

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
      const { data: settings, error: settingsError } = await supabase.from("activity_settings").select("start_date").eq("user_id", data.user.id).maybeSingle();
      if (!active) return;
      if (settingsError) setError("Nie udało się odczytać ustawień dziennika. Uruchom plik supabase/activity_journal.sql w Supabase SQL Editor.");
      else if (settings) {
        setStartDate(settings.start_date);
        setSetupDate(settings.start_date);
        setWeekOffset(weekOffsetForToday(settings.start_date, dateKey(new Date())));
      } else setSetupDate(dateKey(new Date()));
      setLoadingSettings(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (event === "SIGNED_IN" && currentUserId && session?.user.id !== currentUserId)) {
        setUser(null);
        setEntries([]);
        setStartDate(null);
        setSelectedCell(null);
        router.replace("/auth");
      }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [configured, router]);

  const userId = user?.id;
  const weekFirst = week?.first;
  const weekLast = week?.last;
  useEffect(() => {
    if (!userId || !weekFirst || !weekLast) return;
    let active = true;
    void getSupabase().from("activity_entries").select("user_id,activity_date,slot_index,activity,mood_percent,updated_at").eq("user_id", userId).gte("activity_date", weekFirst).lte("activity_date", weekLast).then(({ data, error: queryError }) => {
      if (!active) return;
      if (queryError) setError("Nie udało się odczytać aktywności. Sprawdź, czy uruchomiono supabase/activity_journal.sql.");
      else setEntries((data ?? []) as ActivityEntry[]);
      setLoadingEntries(false);
    });
    return () => { active = false; };
  }, [userId, weekFirst, weekLast]);

  async function saveStartDate() {
    if (!user || !setupDate) return;
    setError(""); setNotice(""); setSavingSettings(true);
    const { error: saveError } = await getSupabase().from("activity_settings").upsert({ user_id: user.id, start_date: setupDate, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (saveError) setError(`Nie udało się zapisać dnia rozpoczęcia: ${saveError.message}`);
    else {
      setStartDate(setupDate);
      setWeekOffset(weekOffsetForToday(setupDate, dateKey(new Date())));
      setEntries([]);
      setLoadingEntries(true);
      setNotice("Dzień rozpoczęcia został zapisany. Wcześniejsze wpisy pozostają przypisane do swoich dat.");
    }
    setSavingSettings(false);
  }

  function moveWeek(direction: number) {
    const next = Math.max(0, weekOffset + direction);
    if (next === weekOffset) return;
    setWeekOffset(next);
    setLoadingEntries(true);
    setEntries([]);
    setNotice("");
  }

  function goToCurrentWeek() {
    if (!startDate) return;
    const next = weekOffsetForToday(startDate, dateKey(new Date()));
    if (next === weekOffset) return;
    setWeekOffset(next);
    setLoadingEntries(true);
    setEntries([]);
    setNotice("");
  }

  function openCell(date: string, slotIndex: number) {
    const entry = entryMap.get(activityKey(date, slotIndex));
    setSelectedCell({ date, slotIndex });
    setActivityDraft(entry?.activity ?? "");
    setMoodDraft(entry?.mood_percent == null ? "" : String(entry.mood_percent));
    setCellError("");
    setNotice("");
  }

  async function saveCell() {
    if (!user || !selectedCell || savingCell) return;
    const activity = activityDraft.trim();
    const mood = moodDraft.trim() === "" ? null : Number(moodDraft);
    if (mood !== null && (!Number.isInteger(mood) || mood < 0 || mood > 100)) { setCellError("Samopoczucie musi być liczbą całkowitą od 0 do 100."); return; }
    const key = activityKey(selectedCell.date, selectedCell.slotIndex);
    const existing = entryMap.get(key);
    if (!activity && mood === null && existing && !window.confirm("Wyczyścić to pole dziennika?")) return;

    setSavingCell(true); setCellError(""); setError("");
    const supabase = getSupabase();
    if (!activity && mood === null) {
      if (existing) {
        const { error: deleteError } = await supabase.from("activity_entries").delete().eq("user_id", user.id).eq("activity_date", selectedCell.date).eq("slot_index", selectedCell.slotIndex);
        if (deleteError) setCellError("Nie udało się wyczyścić pola. Spróbuj ponownie.");
        else { setEntries(current => current.filter(entry => activityKey(entry.activity_date, entry.slot_index) !== key)); setSelectedCell(null); setNotice("Pole zostało wyczyszczone."); }
      } else setSelectedCell(null);
    } else {
      const entry: ActivityEntry = { user_id: user.id, activity_date: selectedCell.date, slot_index: selectedCell.slotIndex, activity, mood_percent: mood, updated_at: new Date().toISOString() };
      const { error: saveError } = await supabase.from("activity_entries").upsert(entry, { onConflict: "user_id,activity_date,slot_index" });
      if (saveError) setCellError(`Nie udało się zapisać pola: ${saveError.message}`);
      else { setEntries(current => [...current.filter(item => activityKey(item.activity_date, item.slot_index) !== key), entry]); setSelectedCell(null); setNotice("Aktywność została zapisana."); }
    }
    setSavingCell(false);
  }

  async function signOut() {
    const { error: signOutError } = await getSupabase().auth.signOut({ scope: "local" });
    if (signOutError) setError("Nie udało się wylogować. Spróbuj ponownie.");
    else router.replace("/");
  }

  if (!configured) return <main className="grid min-h-screen place-items-center bg-[#f6f8f4] p-6"><div className="max-w-lg rounded-3xl border border-[#e1e9df] bg-white p-9"><Brand /><h1 className="font-display mt-7 text-3xl text-[#255146]">Skonfiguruj Supabase</h1><p className="mt-4 text-[#6b8176]">Uzupełnij .env.local zgodnie z README i uruchom skrypt supabase/activity_journal.sql.</p></div></main>;
  if (checking || !user) return <div className="grid min-h-screen place-items-center bg-[#f6f8f4] text-sm text-[#668477]">Otwieranie dziennika aktywności…</div>;

  return <>
    <div className="app-shell min-h-screen bg-[#f5f7f3] text-[#23483f] lg:flex">
      {menuOpen && <button type="button" aria-label="Zamknij menu" className="fixed inset-0 z-30 bg-[#183e36]/40 lg:hidden" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar fixed inset-y-0 left-0 z-40 flex w-[274px] flex-col bg-[#214f44] px-5 py-7 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2"><Brand light /><button type="button" className="lg:hidden" aria-label="Zamknij menu" onClick={() => setMenuOpen(false)}><X size={20} /></button></div>
        <p className="mb-4 mt-14 px-4 text-[11px] font-bold tracking-[.17em] text-[#94beaa] uppercase">Twoja przestrzeń</p>
        <nav aria-label="Nawigacja główna" className="space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-[#d0e2d7] transition hover:bg-white/10"><BookOpenText size={19} /> Dziennik Myśli CBT</Link>
          <Link href="/dashboard/activity" aria-current="page" className="flex items-center gap-3 rounded-xl bg-white/15 px-4 py-3.5 text-sm font-semibold text-white"><Activity size={19} /> Dziennik aktywności <ChevronRight className="ml-auto" size={16} /></Link>
          <button type="button" disabled className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm text-[#b9d0c5] opacity-70"><Heart size={19} /> Mapa emocji <span className="ml-auto text-[10px]">WKRÓTCE</span></button>
          <Link href="/dashboard/exercises" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-[#d0e2d7] transition hover:bg-white/10"><Sparkles size={19} /> Ćwiczenia</Link>
        </nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/8 p-5"><span className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-white/15"><CircleHelp size={19} /></span><p className="text-sm font-semibold">Zauważ swój rytm dnia.</p><p className="mt-2 text-xs leading-5 text-[#b9d5c6]">Zapisuj aktywności i samopoczucie bez oceniania siebie.</p></div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="screen-only sticky top-0 z-20 flex items-center justify-between border-b border-[#e4ebe3] bg-[#f9fbf8]/95 px-5 py-4 backdrop-blur sm:px-8 lg:px-12"><div className="flex items-center gap-3"><button type="button" aria-label="Otwórz menu" className="rounded-lg p-2 lg:hidden" onClick={() => setMenuOpen(true)}><Menu size={22} /></button><span className="text-sm font-medium text-[#789084]">Twoja przestrzeń</span><ChevronRight size={15} className="text-[#acbdb2]" /><span className="text-sm font-bold text-[#285a4b]">Dziennik aktywności</span></div><div className="flex items-center gap-3 sm:gap-5"><span className="hidden max-w-52 truncate text-sm text-[#557266] sm:inline">{user.email}</span><span className="grid h-9 w-9 place-items-center rounded-full bg-[#dceee1] text-sm font-bold text-[#3a7860]">{user.email?.charAt(0).toUpperCase()}</span><button type="button" onClick={signOut} className="inline-flex items-center gap-2 text-sm font-semibold text-[#607e70] hover:text-[#1d594b]" aria-label="Wyloguj"><LogOut size={18} /><span className="hidden md:inline">Wyloguj</span></button></div></header>
        <main className="mx-auto max-w-[1390px] px-5 pb-20 pt-10 sm:px-8 lg:px-10 lg:pt-12">
          <div className="mb-8"><div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-[.15em] text-[#65a184] uppercase"><span className="h-2 w-2 rounded-full bg-[#72ae8b]" /> Nowe narzędzie</div><h1 className="font-display text-4xl leading-tight text-[#204a3e] sm:text-5xl">Dziennik aktywności</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[#73897d]">Zobacz, jak zmienia się Twoje samopoczucie w ciągu dnia. Kliknij wybraną godzinę i zapisz czynność oraz ocenę 0–100%.</p></div>
          {error && <div role="alert" className="mb-5 rounded-xl border border-[#eed2cd] bg-[#fff5f2] px-5 py-4 text-sm text-[#a45848]">{error}</div>}
          {notice && <div role="status" className="mb-5 rounded-xl border border-[#cde6d3] bg-[#f0f8f0] px-5 py-4 text-sm text-[#387457]">{notice}</div>}
          {loadingSettings ? <div className="rounded-2xl border border-[#e1e9df] bg-white p-10 text-center text-sm text-[#84998c]">Wczytywanie ustawień…</div> : <>
            <section className="mb-8 rounded-[24px] border border-[#dfe9de] bg-white p-6 shadow-[0_7px_24px_rgba(34,74,52,.035)] sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-6"><div><div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[.12em] text-[#6da185] uppercase"><CalendarDays size={15} /> Początek Twojego tygodnia</div><h2 className="text-lg font-bold text-[#315b49]">{startDate ? `Twój tydzień zaczyna się w ${weekdayName(startDate)}` : "Wybierz dzień rozpoczęcia"}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#81968a]">Może to być dzień rozpoczęcia dziennika albo dzień wizyty. Wybrany dzień oddzieli gruba linia w tabeli. Zmiana daty nie usuwa zapisanych aktywności.</p></div><div className="flex w-full flex-wrap items-end gap-3 sm:w-auto"><div><label htmlFor="activity-start" className="mb-2 block text-xs font-bold text-[#567864]">Dzień rozpoczęcia / wizyty</label><input id="activity-start" type="date" required value={setupDate} onChange={event => setSetupDate(event.target.value)} className="field min-w-[190px] !bg-white" /></div><button type="button" disabled={!setupDate || savingSettings || setupDate === startDate} onClick={saveStartDate} className="inline-flex items-center gap-2 rounded-xl bg-[#2e765e] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#25674f] disabled:opacity-50"><Check size={16} /> {savingSettings ? "Zapisywanie…" : startDate ? "Zmień dzień" : "Rozpocznij dziennik"}</button></div></div>
            </section>
            {startDate && week && <>
              <section className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><p className="mb-1 text-xs font-bold tracking-[.12em] text-[#71a78b] uppercase">Tydzień {weekOffset + 1}</p><h2 className="font-display text-2xl text-[#2d5a48] sm:text-3xl">{formatDay(week.first, true)} – {formatDay(week.last, true)}</h2><p className="mt-1 text-xs text-[#8ca194]">Od {weekdayName(startDate).toLowerCase()} do {WEEKDAYS[(week.boundaryDay + 6) % 7].toLowerCase()}. Kolumny pozostają w kolejności od poniedziałku do niedzieli.</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={weekOffset === 0} onClick={() => moveWeek(-1)} className="activity-nav-button"><ChevronLeft size={17} /> Poprzedni</button><button type="button" onClick={goToCurrentWeek} className="activity-nav-button">Bieżący</button><button type="button" onClick={() => moveWeek(1)} className="activity-nav-button">Następny <ChevronRight size={17} /></button><button type="button" disabled={loadingEntries} onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-[#2e765e] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#25674f] disabled:opacity-50"><Printer size={17} /> Drukuj tydzień</button></div></section>
              <div className="mb-3 flex flex-wrap items-center gap-5 text-xs text-[#7b9382]"><span className="inline-flex items-center gap-2"><span className="h-4 w-1 rounded-full bg-[#2d7058]" /> Granica Twojego tygodnia</span><span className="inline-flex items-center gap-2"><span className="rounded-md bg-[#e3f3e9] px-2 py-0.5 font-bold text-[#2f8060]">0–100%</span> Samopoczucie: 0 = bardzo źle, 100 = bardzo dobrze</span></div>
              {loadingEntries ? <div className="rounded-2xl border border-[#e1e9df] bg-white p-10 text-center text-sm text-[#84998c]">Wczytywanie tygodnia…</div> : <div className="activity-grid-scroll" role="region" aria-label="Tygodniowa tabela aktywności" tabIndex={0}><ActivityGrid week={week} entryMap={entryMap} onCellClick={openCell} /></div>}
            </>}
          </>}
          <p className="mt-10 text-center text-xs leading-6 text-[#97a99c]">Dziennik wspiera refleksję i pracę na terapii. Nie zastępuje kontaktu ze specjalistą.</p>
        </main>
      </div>
    </div>
    {week && <section className="activity-print" aria-label="Tydzień dziennika aktywności do wydruku"><h1>Dziennik aktywności</h1><p>{formatDay(week.first, true)} – {formatDay(week.last, true)} · Początek tygodnia: {weekdayName(startDate!)}</p><ActivityGrid week={week} entryMap={entryMap} /></section>}
    {selectedCell && <div className="activity-modal-backdrop" role="presentation"><div className="activity-modal" role="dialog" aria-modal="true" aria-labelledby="activity-modal-title"><div className="flex items-start justify-between gap-4"><div><p className="mb-1 text-xs font-bold tracking-[.12em] text-[#74a98d] uppercase">Wpis aktywności</p><h2 id="activity-modal-title" className="font-display text-2xl text-[#275441]">{WEEKDAYS[weekDayOf(selectedCell.date)]}, {formatDay(selectedCell.date, true)}</h2><p className="mt-1 text-sm text-[#7c9485]">{ACTIVITY_SLOTS[selectedCell.slotIndex]}</p></div><button type="button" aria-label="Zamknij" onClick={() => setSelectedCell(null)} className="rounded-lg p-2 text-[#789080] hover:bg-[#f1f6f0]"><X size={20} /></button></div><div className="mt-7"><label htmlFor="activity-description" className="mb-2 block text-sm font-bold text-[#315d48]">Co robiłam/łem?</label><textarea id="activity-description" rows={5} maxLength={2000} value={activityDraft} onChange={event => setActivityDraft(event.target.value)} placeholder="Np. spacer, praca, odpoczynek…" className="field resize-y" autoFocus /></div><div className="mt-5"><label htmlFor="activity-mood" className="mb-2 block text-sm font-bold text-[#315d48]">Samopoczucie (0–100%)</label><div className="flex items-center gap-3"><input id="activity-mood" type="number" min="0" max="100" step="1" value={moodDraft} onChange={event => setMoodDraft(event.target.value)} placeholder="Np. 60" className="field max-w-[150px]" /><span className="rounded-xl bg-[#e7f5e9] px-4 py-3 text-sm font-bold text-[#34835e]">{moodDraft === "" ? "—" : `${moodDraft}%`}</span></div><p className="mt-2 text-xs text-[#91a397]">0 = bardzo źle · 100 = bardzo dobrze. Możesz pozostawić to pole puste.</p></div>{cellError && <p role="alert" className="mt-5 rounded-xl bg-[#fff1ee] px-4 py-3 text-sm text-[#aa5149]">{cellError}</p>}<div className="mt-7 flex justify-end gap-3 border-t border-[#e7eee6] pt-5"><button type="button" onClick={() => setSelectedCell(null)} className="rounded-xl border border-[#d9e7da] px-5 py-3 text-sm font-semibold text-[#65806d]">Anuluj</button><button type="button" disabled={savingCell} onClick={saveCell} className="inline-flex items-center gap-2 rounded-xl bg-[#2e765e] px-5 py-3 text-sm font-bold text-white hover:bg-[#25674f] disabled:opacity-50"><Save size={16} /> {savingCell ? "Zapisywanie…" : "Zapisz pole"}</button></div></div></div>}
  </>;
}

function weekDayOf(value: string) { return (new Date(`${value}T12:00:00`).getDay() + 6) % 7; }
function weekdayName(value: string) { return WEEKDAYS[weekDayOf(value)]; }

function ActivityGrid({ week, entryMap, onCellClick }: { week: Week; entryMap: Map<string, ActivityEntry>; onCellClick?: (date: string, slotIndex: number) => void }) {
  return <table className="activity-grid"><colgroup><col className="activity-time-col" />{WEEKDAYS.map(day => <col key={day} />)}</colgroup><thead><tr><th scope="col" aria-label="Godziny" />{WEEKDAYS.map((day, index) => <th key={day} scope="col" className={index === week.boundaryDay ? "activity-boundary" : ""}><span>{day}</span><small>{formatDay(week.days[index])}</small></th>)}</tr></thead><tbody>{ACTIVITY_SLOTS.map((slot, slotIndex) => <tr key={slot}><th scope="row">{slot}</th>{week.days.map((day, dayIndex) => { const entry = entryMap.get(activityKey(day, slotIndex)); return <td key={day} className={dayIndex === week.boundaryDay ? "activity-boundary" : ""}>{onCellClick ? <button type="button" className={`activity-cell ${entry ? "has-entry" : ""}`} onClick={() => onCellClick(day, slotIndex)} aria-label={`${day}, ${formatDay(day, true)}, ${slot}: ${entry?.activity || "dodaj aktywność"}${entry?.mood_percent == null ? "" : `, samopoczucie ${entry.mood_percent}%`}`}><span className="activity-cell-text">{entry?.activity || <span className="activity-cell-placeholder">+ Dodaj</span>}</span>{entry?.mood_percent != null && <span className="activity-mood">{entry.mood_percent}%</span>}</button> : <div className="activity-print-cell"><span>{entry?.activity}</span>{entry?.mood_percent != null && <strong>{entry.mood_percent}%</strong>}</div>}</td>; })}</tr>)}</tbody></table>;
}
