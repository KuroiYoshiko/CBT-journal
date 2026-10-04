export const MAX_ARROW_STEPS = 8;
export const MAX_SITUATION_LENGTH = 500;
export const MAX_ANSWER_LENGTH = 250;
export const MAX_WORKSHEET_LENGTH = 1600;

export const ARROW_EXAMPLE = {
  situation: "Koleżanka, która mi się podoba, nie odpisała na moją wiadomość.",
  answers: [
    "Chyba mnie nie polubiła.",
    "Nie jestem osobą wartą uwagi.",
    "Nie nadaję się do związku.",
    "Zawsze będę sam/a.",
    "Nie da się mnie kochać.",
  ],
} as const;

export type DownwardArrowEntry = {
  id: string;
  user_id: string;
  situation: string;
  answers: string[];
  created_at: string;
  updated_at: string;
};

export function arrowPrompt(index: number) {
  return index === 0 ? "Co to o mnie mówi?" : "Jeśli to prawda, co to o mnie mówi?";
}

export function normalizeArrowEntry(value: unknown): DownwardArrowEntry | null {
  if (typeof value !== "object" || value === null) return null;
  const entry = value as Record<string, unknown>;
  if (typeof entry.id !== "string" || typeof entry.user_id !== "string" || typeof entry.situation !== "string"
    || !Array.isArray(entry.answers) || !entry.answers.every(answer => typeof answer === "string")
    || typeof entry.created_at !== "string" || typeof entry.updated_at !== "string") return null;
  return entry as DownwardArrowEntry;
}

export function validateArrowDraft(situation: string, answers: string[]) {
  const cleanSituation = situation.trim();
  const cleanAnswers = answers.map(answer => answer.trim());
  if (!cleanSituation) return "Opisz sytuację, od której zaczynasz ćwiczenie.";
  if (cleanSituation.length > MAX_SITUATION_LENGTH) return `Sytuacja może mieć maksymalnie ${MAX_SITUATION_LENGTH} znaków.`;
  if (!cleanAnswers.length || cleanAnswers.length > MAX_ARROW_STEPS) return `Dodaj od 1 do ${MAX_ARROW_STEPS} odpowiedzi.`;
  if (cleanAnswers.some(answer => !answer)) return "Uzupełnij każdą dodaną odpowiedź albo usuń pusty krok.";
  if (cleanAnswers.some(answer => answer.length > MAX_ANSWER_LENGTH)) return `Jedna odpowiedź może mieć maksymalnie ${MAX_ANSWER_LENGTH} znaków.`;
  if (cleanSituation.length + cleanAnswers.join("").length > MAX_WORKSHEET_LENGTH) return `Całe ćwiczenie może mieć maksymalnie ${MAX_WORKSHEET_LENGTH} znaków, aby zmieściło się na połowie kartki.`;
  return null;
}
