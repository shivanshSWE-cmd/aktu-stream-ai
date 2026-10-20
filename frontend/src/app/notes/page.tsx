"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, Download, ExternalLink, FileText, Folder, Search, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface Portal {
  id: string;
  title: string;
  count: string;
  badge: string;
  icon: string;
}

export default function NotesPage() {
  const [portals, setPortals] = useState<Portal[]>([
    { id: "1year", title: "1st Year Notes", count: "13 Subjects • 182 Notes", badge: "1st Year • All Branches", icon: "📚" },
    { id: "2ndyear", title: "2nd Year Notes", count: "15 Subjects • 881 Notes", badge: "2nd Year • CSE / IT", icon: "📝" },
    { id: "3year", title: "3rd Year Notes", count: "34 Subjects • 323 Notes", badge: "3rd Year • Core Branches", icon: "💻" },
    { id: "year4_other", title: "4th Year Notes", count: "20 Subjects • 127 Notes", badge: "4th Year • Electives", icon: "🎓" },
    { id: "multiatom_year2", title: "MultiAtoms 2nd Year", count: "MultiAtoms Quantum Notes", badge: "Quantum Notes", icon: "⚛️" },
    { id: "multiatom_year3", title: "MultiAtoms 3rd Year", count: "MultiAtoms 3rd Year Notes", badge: "Quantum Notes", icon: "⚛️" },
  ]);

  const [activePortalId, setActivePortalId] = useState<string>("1year");
  const [yearData, setYearData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadYearNotes() {
      try {
        setLoading(true);
        const res = await apiClient.getNotesByYear(activePortalId).catch(() => null);
        setYearData(res);
        // Open first 3 subjects by default
        if (res && res.subjects) {
          const initialOpen: Record<string, boolean> = {};
          Object.keys(res.subjects).slice(0, 3).forEach((k) => {
            initialOpen[k] = true;
          });
          setOpenSubjects(initialOpen);
        }
      } catch (err) {
        console.error("Failed to load notes data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadYearNotes();
  }, [activePortalId]);

  const toggleSubject = (name: string) => {
    setOpenSubjects((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const subjects = yearData?.subjects || {};
  const subjectMeta = yearData?.subjectMeta || {};

  const filteredSubjectNames = Object.keys(subjects).filter((name) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    const meta = subjectMeta[name] || {};
    return (
      name.toLowerCase().includes(q) ||
      (meta.title && meta.title.toLowerCase().includes(q)) ||
      (meta.badge && meta.badge.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-surface-border bg-surface-dark p-8 sm:p-10 shadow-sm">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-primary/20 bg-brand-primary/10 px-3.5 py-1 text-xs font-mono font-semibold text-brand-primary">
            <Sparkles className="h-4 w-4" />
            <span>AKTU Notes Store • Gateway Classes & MultiAtoms</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-text-primary leading-tight font-heading">
            AKTU B.Tech <span className="text-brand-primary">Notes Store.</span>
          </h1>

          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Direct access to handwritten lecture notes, unit-wise PDF summaries, and solved syllabus packages extracted from the official Gateway Classes and MultiAtoms archive.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-mono">
            <Link
              href="/pyqs"
              className="inline-flex items-center gap-2 rounded-xl bg-surface-dark border border-surface-border px-4 py-2 font-semibold text-text-primary hover:border-brand-primary/50 transition-colors"
            >
              <FileText className="h-4 w-4 text-brand-secondary" />
              <span>Browse 1,961+ Solved PYQs &rarr;</span>
            </Link>
            <Link
              href="/subjects"
              className="inline-flex items-center gap-2 rounded-xl bg-surface-dark border border-surface-border px-4 py-2 font-semibold text-text-primary hover:border-brand-primary/50 transition-colors"
            >
              <BookOpen className="h-4 w-4 text-brand-primary" />
              <span>View Video Syllabus &rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Year Portals Navigation Pills */}
      <div className="flex border-b border-surface-border overflow-x-auto gap-2 pb-1 font-mono">
        {portals.map((p) => {
          const isActive = activePortalId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setActivePortalId(p.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-brand-primary text-background-dark font-bold shadow-solar-glow"
                  : "bg-surface-dark border border-surface-border text-text-secondary hover:text-text-primary hover:bg-surface-border"
              }`}
            >
              <span>{p.icon}</span>
              <span>{p.title}</span>
            </button>
          );
        })}
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center gap-4 rounded-2xl border border-surface-border bg-surface-dark p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search notes by subject name (e.g. Maths, Physics, COA, DSA)..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full rounded-xl border border-surface-border bg-background-dark py-2.5 pl-10 pr-4 text-xs font-mono text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none transition-all"
          />
        </div>
        <span className="text-xs font-mono text-text-secondary shrink-0 hidden sm:block">
          {filteredSubjectNames.length} Subjects Available
        </span>
      </div>

      {/* Subjects Accordion List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
        </div>
      ) : filteredSubjectNames.length > 0 ? (
        <div className="space-y-4">
          {filteredSubjectNames.map((subjName) => {
            const isOpen = !!openSubjects[subjName];
            const meta = subjectMeta[subjName] || {};
            const unitsObj = subjects[subjName] || {};
            const unitKeys = Object.keys(unitsObj);

            return (
              <div
                key={subjName}
                className="rounded-2xl border border-surface-border bg-surface-dark overflow-hidden transition-all duration-200"
              >
                {/* Subject Header Toggle */}
                <button
                  onClick={() => toggleSubject(subjName)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-background-dark/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background-dark border border-surface-border text-lg">
                      {meta.icon || "📚"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold text-text-primary font-heading truncate">
                          {meta.title || subjName}
                        </h3>
                        {meta.badge && (
                          <span className="rounded-md bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 text-[10px] font-mono font-bold text-brand-primary">
                            {meta.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-text-secondary mt-0.5 block">
                        {unitKeys.length} Units / Notes Packages
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-text-secondary transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-brand-primary" : ""
                    }`}
                  />
                </button>

                {/* Units & PDF Download Links */}
                {isOpen && (
                  <div className="border-t border-surface-border bg-background-dark/60 p-5 space-y-4">
                    {unitKeys.map((uKey) => {
                      const uData = unitsObj[uKey];
                      const isDict = typeof uData === "object" && uData !== null && !Array.isArray(uData);

                      return (
                        <div key={uKey} className="space-y-2">
                          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-brand-secondary flex items-center gap-1.5">
                            <Folder className="h-3.5 w-3.5" />
                            <span>{uKey.replace(/_/g, " ")}</span>
                          </h4>

                          {isDict ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                              {Object.entries(uData).map(([lecName, link]) => (
                                <a
                                  key={lecName}
                                  href={link as string}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group flex items-center justify-between rounded-xl bg-surface-dark border border-surface-border p-3 text-xs text-text-secondary hover:text-background-dark hover:bg-brand-primary hover:border-brand-primary transition-all font-mono"
                                >
                                  <span className="truncate group-hover:font-bold">{lecName.toUpperCase()}</span>
                                  <Download className="h-3.5 w-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                                </a>
                              ))}
                            </div>
                          ) : typeof uData === "string" ? (
                            <a
                              href={uData}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-background-dark shadow-solar-glow hover:bg-brand-primary/90 transition-all font-mono"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Download Complete {uKey.replace(/_/g, " ")} PDF</span>
                            </a>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-surface-border bg-surface-dark p-12 text-center text-text-secondary font-mono text-xs">
          No subjects matching &quot;{searchFilter}&quot; in this year portal.
        </div>
      )}
    </div>
  );
}
