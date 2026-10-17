"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen, Search, ShieldCheck, Tv, UploadCloud, Brain, Menu, X } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { name: "Curriculum", href: "/subjects", icon: BookOpen },
    { name: "AI/ML Track", href: "/ai-track", icon: Brain },
    { name: "Student Upload", href: "/upload", icon: UploadCloud },
    { name: "Ingestion & Quota", href: "/admin/ingestion", icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-border bg-background-dark/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-dark border border-surface-border shadow-md group-hover:border-brand-primary/50 transition-all">
            <Tv className="h-5 w-5 text-brand-secondary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-text-primary font-heading">
                AKTU Stream
              </span>
              <span className="rounded bg-brand-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-brand-primary border border-brand-primary/20 font-mono">
                AI
              </span>
            </div>
            <p className="text-[11px] font-medium text-text-secondary hidden sm:block">
              Academic Workstation
            </p>
          </div>
        </Link>

        {/* Global Semantic Search Bar */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-lg mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Search concepts, algorithms, proofs (e.g. Relational Algebra, B-Trees)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-surface-border bg-surface-dark py-2 pl-10 pr-4 text-xs text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/40 transition-all"
            />
          </div>
        </form>

        {/* Desktop Nav Actions */}
        <nav className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/30 shadow-sm"
                    : "text-text-secondary hover:bg-surface-dark hover:text-text-primary border border-transparent"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-brand-primary" : "text-text-secondary"}`} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-text-secondary hover:text-text-primary bg-surface-dark border border-surface-border"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-surface-border bg-surface-dark px-4 pt-3 pb-5 space-y-3">
          <form onSubmit={handleSearchSubmit} className="w-full">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <input
                type="text"
                placeholder="Search transcript concepts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-background-dark py-2 pl-9 pr-3 text-xs text-text-primary"
              />
            </div>
          </form>

          <div className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
                    isActive
                      ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                      : "text-text-secondary hover:bg-background-dark hover:text-text-primary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
