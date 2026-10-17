import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "AKTU Stream AI | B.Tech Engineering & AI/ML Streaming Platform",
  description:
    "Enterprise-grade educational video streaming platform strictly aligned with Dr. A.P.J. Abdul Kalam Technical University (AKTU) curriculum.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-gray-100 antialiased flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-gray-800/80 bg-[#070a12] py-8 text-center text-xs text-gray-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>
              &copy; {new Date().getFullYear()} AKTU Stream AI. Curriculum aligned with Dr. A.P.J. Abdul Kalam Technical University, Lucknow.
            </p>
            <div className="flex items-center gap-4 text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Quota Engine Active
              </span>
              <span>•</span>
              <span>HLS Multi-Bitrate</span>
              <span>•</span>
              <span>pgvector Embeddings</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
