import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Twój Pomocnik w Terapii — Dziennik myśli CBT", description: "Prywatna przestrzeń do zapisywania sytuacji, myśli i emocji między sesjami terapii CBT." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pl"><body>{children}</body></html>; }
