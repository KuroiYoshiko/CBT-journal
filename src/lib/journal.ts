export const DISTORTIONS = ["Myślenie wszystko albo nic", "Filtr mentalny", "Przeskakiwanie do konkluzji / Czytanie w myślach", "Uzasadnianie emocjonalne", "Etykietowanie", "Nadmierne uogólnianie", "Wyolbrzymianie i minimalizacja", "Powinienem / Muszę", "Personalizacja", "Pomijanie pozytywów"] as const;

export type Emotion = { name: string; intensity: number };
export type JournalEntry = { id: string; user_id: string; occurred_at: string; situation: string; automatic_thought: string; body_sensations: string; emotions: Emotion[]; behavior: string; distortions: string[]; alternative_thought: string | null; created_at: string };

export function dateTimeLocalNow() { const now = new Date(); const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000); return local.toISOString().slice(0, 16); }
export function formatDate(value: string) { return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
