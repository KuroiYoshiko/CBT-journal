# Twój Pomocnik w Terapii

Prywatny dziennik myśli CBT zbudowany w Next.js (App Router, TypeScript, Tailwind CSS) i Supabase. Pozwala zapisywać sytuacje, myśli, reakcje ciała, emocje z natężeniem 0–100%, zachowania, zniekształcenia poznawcze i alternatywne myśli. Zapisane wpisy można edytować, usuwać oraz drukować w formacie A4 na sesję terapeutyczną.

## Uruchomienie

1. Utwórz projekt w [Supabase](https://supabase.com/).
2. W Supabase **SQL Editor** uruchom cały plik [`supabase/schema.sql`](supabase/schema.sql). Skrypt tworzy tabelę, włącza RLS i dodaje polityki dostępu wyłącznie do własnych wpisów.
3. Skopiuj `.env.example` do `.env.local` i wpisz **Project URL** oraz **publishable key** z ustawień projektu Supabase (`NEXT_PUBLIC_SUPABASE_URL` i `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Starsza nazwa `NEXT_PUBLIC_SUPABASE_ANON_KEY` również jest obsługiwana. Nie używaj `service_role` key w zmiennych `NEXT_PUBLIC_*`.
4. W **Authentication → Providers → Email** włącz logowanie e-mail. Jeśli wymagane jest potwierdzenie adresu, dodaj adres aplikacji do **Authentication → URL Configuration** (np. `http://localhost:3000`).
5. Uruchom:

```bash
npm install
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000). Po zmianie `.env.local` zrestartuj serwer.

## Bezpieczeństwo

Tabela `public.cbt_entries` ma włączone i wymuszone Row Level Security. Polityki `select`, `insert`, `update` i `delete` porównują `auth.uid()` z `user_id` rekordu. Rola anonimowa nie ma uprawnień do tabeli, a aplikacja korzysta wyłącznie z publicznego klucza projektu. Dane dziennika są pobierane po zalogowaniu. Wpisy są wyświetlane wyłącznie po stronie zalogowanego użytkownika.

To narzędzie wspierające pracę własną; nie zastępuje terapii ani pomocy kryzysowej.

## Struktura

```text
src/app/page.tsx            strona główna
src/app/auth/page.tsx       logowanie i rejestracja
src/app/dashboard/page.tsx  formularz, historia i wydruk
src/app/globals.css         style interfejsu i A4 @media print
src/lib/supabase.ts         klient Supabase
src/lib/journal.ts          typy i lista zniekształceń
src/components/brand.tsx    identyfikacja aplikacji
supabase/schema.sql         schemat bazy i polityki RLS
```
