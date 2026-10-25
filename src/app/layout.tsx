import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PharmaMind — Your AI Pharmacology Study Partner",
  description: "Turn pharmacology PDFs into quizzes, explanations, and study conversations.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
