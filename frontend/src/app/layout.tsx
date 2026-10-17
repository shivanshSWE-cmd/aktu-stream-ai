import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "AKTU Stream AI | Engineering Workstation & AI/ML Platform",
  description:
    "AMOLED-friendly academic workstation for Dr. A.P.J. Abdul Kalam Technical University (AKTU) curriculum and specialized AI/ML tracks.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background-dark text-text-primary antialiased flex flex-col font-sans selection:bg-brand-primary/30 selection:text-brand-primary">
        <Header />
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-surface-border bg-surface-dark py-6 text-center text-xs text-text-secondary">
          <div className="max-w-[1600px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>
              &copy; {new Date().getFullYear()} AKTU Stream AI. Academic workstation aligned with Dr. A.P.J. Abdul Kalam Technical University.
            </p>
            <div className="flex items-center gap-3 text-text-secondary font-mono text-[11px]">
              <span className="flex items-center gap-1.5 text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                Quota Engine Active
              </span>
              <span>•</span>
              <span>Adaptive HLS (1080p/720p/480p)</span>
              <span>•</span>
              <span className="text-brand-secondary">768-d pgvector</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
