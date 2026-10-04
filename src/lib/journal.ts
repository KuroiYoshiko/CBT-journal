export const DISTORTIONS = ['Myślenie "wszystko albo nic"', "Filtr mentalny", "Przeskakiwanie do konkluzji / Czytanie w myślach", "Uzasadnianie emocjonalne", "Etykietowanie", "Nadmierne uogólnianie", "Wyolbrzymianie i minimalizacja", "Powinienem / Muszę", "Personalizacja", "Pomijanie pozytywów"] as const;

export function normalizeDistortion(value: string) {
  return value === "Myślenie wszystko albo nic" ? DISTORTIONS[0] : value;
}

export type Emotion = { name: string; intensity: number };
export type JournalEntry = { id: string; user_id: string; occurred_at: string; situation: string; automatic_thought: string; body_sensations: string; emotions: Emotion[]; behavior: string; distortions: string[]; created_at: string };

export function dateTimeLocalNow() { const now = new Date(); const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000); return local.toISOString().slice(0, 16); }
export function formatDate(value: string) { return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }

export type DateOrder = "newest" | "oldest";

export function localDayKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function entriesForDateRange(entries: JournalEntry[], fromDay: string, toDay: string, order: DateOrder) {
  if (fromDay && toDay && fromDay > toDay) return [];

  return entries
    .filter(entry => {
      const day = localDayKey(entry.occurred_at);
      return (!fromDay || day >= fromDay) && (!toDay || day <= toDay);
    })
    .sort((a, b) => {
      const eventDifference = Date.parse(a.occurred_at) - Date.parse(b.occurred_at);
      const createdDifference = Date.parse(a.created_at) - Date.parse(b.created_at);
      const result = eventDifference || createdDifference || a.id.localeCompare(b.id);
      return order === "oldest" ? result : -result;
    });
}
