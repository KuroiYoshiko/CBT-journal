export const WEEKDAYS = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"] as const;

export const ACTIVITY_SLOTS = [
  "07:00–09:00", "09:00–10:00", "10:00–11:00", "11:00–12:00", "12:00–13:00",
  "13:00–14:00", "14:00–15:00", "15:00–16:00", "16:00–17:00", "17:00–18:00",
  "18:00–19:00", "19:00–20:00", "20:00–21:00", "21:00–22:00", "22:00–00:00",
] as const;

export type ActivityEntry = {
  user_id: string;
  activity_date: string;
  slot_index: number;
  activity: string;
  mood_percent: number | null;
  updated_at: string;
};

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function addDays(value: string, count: number) {
  const date = parseDateKey(value);
  date.setDate(date.getDate() + count);
  return dateKey(date);
}

export function weekdayIndex(value: string) {
  return (parseDateKey(value).getDay() + 6) % 7;
}

export function weekFor(startDate: string, offset: number) {
  const first = addDays(startDate, offset * 7);
  const last = addDays(first, 6);
  const days = Array.from({ length: 7 }, (_, index) => addDays(first, index));
  days.sort((a, b) => weekdayIndex(a) - weekdayIndex(b));
  return { first, last, days, boundaryDay: weekdayIndex(startDate) };
}

export function weekOffsetForToday(startDate: string, today: string) {
  const utcDay = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day) / 86_400_000;
  };
  return Math.max(0, Math.floor((utcDay(today) - utcDay(startDate)) / 7));
}

export function formatDay(value: string, includeYear = false) {
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", ...(includeYear ? { year: "numeric" } : {}) }).format(parseDateKey(value));
}

export function activityKey(date: string, slotIndex: number) {
  return `${date}:${slotIndex}`;
}
