# Twój Pomocnik w Terapii

Prywatne dzienniki CBT zbudowane w Next.js (App Router, TypeScript, Tailwind CSS) i Supabase. Dziennik myśli pozwala zapisywać sytuacje, myśli, reakcje ciała, emocje z natężeniem 0–100%, zachowania i zniekształcenia poznawcze. Historia jest widoczna jako tabela z siedmioma kolumnami, sortowana według daty zdarzenia, niezależnie od daty utworzenia wpisu. Można wybrać zakres pełnych dni i kolejność dat; wydruk zawiera dokładnie widoczne w tabeli wpisy w tej samej kolejności, jako jedną tabelę A4 w układzie poziomym. Kolumna `alternative_thought` pozostaje w bazie, lecz obecnie nie jest używana w interfejsie ani zmieniana podczas edycji wpisu.

Dziennik aktywności (`/dashboard/activity`) obejmuje kolejne tygodnie od wybranej daty rozpoczęcia lub wizyty. Tabela zachowuje kolumny od poniedziałku do niedzieli i oddziela wybrany początek tygodnia grubą linią. W każdej komórce można zapisać czynność i samopoczucie od 0 do 100%. Przycisk „Drukuj tydzień” drukuje aktualnie widoczny tydzień jako poziomą tabelę A4.

Zakładka **Ćwiczenia** (`/dashboard/exercises`) zawiera technikę „Strzałka w dół”. Po opisaniu sytuacji można dodawać kolejne odpowiedzi na pytanie „Co to o mnie mówi?” i „Jeśli to prawda, co to o mnie mówi?”, edytować je oraz usuwać. Do wydruku zaznacza się zapisane ćwiczenia. Dwa są układane obok siebie na poziomej stronie A4; gdy liczba jest nieparzysta, ostatnie zajmuje jedną połowę strony.

## Uruchomienie

1. Utwórz projekt w [Supabase](https://supabase.com/).
2. W Supabase **SQL Editor** uruchom pliki [`supabase/schema.sql`](supabase/schema.sql), [`supabase/activity_journal.sql`](supabase/activity_journal.sql) i [`supabase/downward_arrow.sql`](supabase/downward_arrow.sql). Jeśli poprzednie dwa były już uruchomione, wystarczy teraz uruchomić tylko `supabase/downward_arrow.sql`. Każdy skrypt włącza RLS i dodaje polityki dostępu wyłącznie do własnych danych.
3. Skopiuj `.env.example` do `.env.local` i wpisz **Project URL** oraz **publishable key** z ustawień projektu Supabase (`NEXT_PUBLIC_SUPABASE_URL` i `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Starsza nazwa `NEXT_PUBLIC_SUPABASE_ANON_KEY` również jest obsługiwana. Nie używaj `service_role` key w zmiennych `NEXT_PUBLIC_*`.
4. W **Authentication → Providers → Email** włącz logowanie e-mail. Jeśli wymagane jest potwierdzenie adresu, dodaj adres aplikacji do **Authentication → URL Configuration** (np. `http://localhost:3000`).
5. Uruchom:

```bash
npm install
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000). Po zmianie `.env.local` zrestartuj serwer.

## Bezpieczeństwo

Tabele `public.cbt_entries`, `public.activity_settings`, `public.activity_entries` i `public.downward_arrow_exercises` mają włączone i wymuszone Row Level Security. Polityki `select`, `insert`, `update` i `delete` porównują `auth.uid()` z `user_id` rekordu. Rola anonimowa nie ma uprawnień do tabel, a aplikacja korzysta wyłącznie z publicznego klucza projektu. Dane dzienników i ćwiczeń są pobierane po zalogowaniu. Aplikacja dodatkowo filtruje zapytania po identyfikatorze użytkownika.

To narzędzie wspierające pracę własną; nie zastępuje terapii ani pomocy kryzysowej.

## Struktura

```text
src/app/page.tsx            strona główna
src/app/auth/page.tsx       logowanie i rejestracja
src/app/dashboard/page.tsx  formularz, historia i wydruk
src/app/dashboard/activity/page.tsx  dziennik aktywności i wydruk tygodnia
src/app/dashboard/exercises/page.tsx  technika Strzałka w dół i wydruk
src/app/globals.css         style interfejsu i A4 @media print
src/lib/supabase.ts         klient Supabase
src/lib/journal.ts          typy i lista zniekształceń
src/lib/activity.ts         godziny, daty i układ tygodnia
src/lib/downward-arrow.ts   typy, przykład i walidacja ćwiczenia
src/components/brand.tsx    identyfikacja aplikacji
supabase/schema.sql         schemat bazy i polityki RLS
supabase/activity_journal.sql  tabele i polityki RLS dziennika aktywności
supabase/downward_arrow.sql  tabela i polityki RLS ćwiczeń
```
