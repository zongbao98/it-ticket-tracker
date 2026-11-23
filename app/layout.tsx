import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "IT Ticket Tracker",
  description: "IT tickets with priority-based SLA tracking",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900">
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="font-semibold">IT Ticket Tracker</Link>
            <Link href="/" className="text-sm hover:underline">Queue</Link>
            <Link href="/new" className="ml-auto rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700">
              Raise ticket
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">
          {/* Pages read the database per request, so they stream in behind this boundary. */}
          <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>{children}</Suspense>
        </main>
      </body>
    </html>
  );
}
