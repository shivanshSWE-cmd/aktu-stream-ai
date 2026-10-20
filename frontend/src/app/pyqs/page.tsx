"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, ExternalLink, FileText, Filter, Search, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface PyqPaper {
  id: string;
  code: string;
  title: string;
  semester: number;
  session: string;
  nonce?: string;
}

export default function PyqBankPage() {
  const [papers, setPapers] = useState<PyqPaper[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedSemester, setSelectedSemester] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    async function fetchPapers() {
      try {
        setLoading(true);
        const res = await apiClient.getPyqs({
          q: debouncedQuery || undefined,
          semester: selectedSemester,
          page,
          limit: 24,
        });
        setPapers(res.papers);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      } catch (err) {
        console.error("Failed to load PYQs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPapers();
  }, [debouncedQuery, selectedSemester, page]);

  const handleSemesterChange = (sem?: number) => {
    setSelectedSemester(sem);
    setPage(1);
  };

  const getDownloadUrl = (paper: PyqPaper) => {
    const code = encodeURIComponent(paper.code);
    const title = encodeURIComponent(paper.title.replace(/\s+/g, "_"));
    const id = encodeURIComponent(paper.id);
    const nonce = encodeURIComponent(paper.nonce || "");
    return `https://getwayclassesnotes.netlify.app/.netlify/functions/download?id=${id}&nonce=${nonce}&code=${code}&title=${title}`;
  };

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-surface-border bg-surface-dark p-8 sm:p-10 shadow-sm">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-primary/20 bg-brand-primary/10 px-3.5 py-1 text-xs font-mono font-semibold text-brand-primary">
            <Sparkles className="h-4 w-4" />
            <span>AKTU End-Semester Examination Archive</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-text-primary leading-tight font-heading">
            1,961+ Official <span className="text-brand-primary">AKTU PYQ Bank.</span>
          </h1>

          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Authentic end-semester university question papers covering Semesters 1 to 8 across all AKTU engineering disciplines with instant code search and direct PDF download.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-mono">
            <Link
              href="/notes"
              className="inline-flex items-center gap-2 rounded-xl bg-surface-dark border border-surface-border px-4 py-2 font-semibold text-text-primary hover:border-brand-primary/50 transition-colors"
            >
              <FileText className="h-4 w-4 text-brand-secondary" />
              <span>Access Handwritten Notes &rarr;</span>
            </Link>
            <Link
              href="/subjects"
              className="inline-flex items-center gap-2 rounded-xl bg-surface-dark border border-surface-border px-4 py-2 font-semibold text-text-primary hover:border-brand-primary/50 transition-colors"
            >
              <Filter className="h-4 w-4 text-brand-primary" />
              <span>Explore Curriculum by Branch &rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-4 rounded-2xl border border-surface-border bg-surface-dark p-4 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search by subject code (BAS101, BCS401) or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-surface-border bg-background-dark py-2 pl-10 pr-4 text-xs font-mono text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none transition-all"
          />
        </div>

        {/* Semester Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 font-mono">
          <button
            onClick={() => handleSemesterChange(undefined)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedSemester === undefined
                ? "bg-brand-primary text-background-dark font-bold shadow-solar-glow"
                : "bg-surface-dark border border-surface-border text-text-secondary hover:text-text-primary hover:bg-surface-border"
            }`}
          >
            All Semesters
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
            <button
              key={sem}
              onClick={() => handleSemesterChange(sem)}
              className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedSemester === sem
                  ? "bg-brand-primary text-background-dark font-bold shadow-solar-glow"
                  : "bg-surface-dark border border-surface-border text-text-secondary hover:text-text-primary hover:bg-surface-border"
              }`}
            >
              S{sem}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs font-mono text-text-secondary">
        <span>Showing {papers.length} of {total} question papers</span>
        <span>Page {page} of {totalPages}</span>
      </div>

      {/* Papers Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
        </div>
      ) : papers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {papers.map((p) => {
            const dlUrl = getDownloadUrl(p);
            return (
              <div
                key={p.id}
                className="group flex flex-col justify-between rounded-2xl border border-surface-border bg-surface-dark p-5 hover:border-brand-primary/50 transition-all duration-200 hover:shadow-ambient-glow"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-brand-primary/10 border border-brand-primary/20 px-2.5 py-0.5 text-xs font-mono font-bold text-brand-primary">
                      {p.code}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-text-secondary">
                      <span className="rounded bg-background-dark border border-surface-border px-2 py-0.5">
                        Sem {p.semester}
                      </span>
                      <span className="rounded bg-background-dark border border-surface-border px-2 py-0.5 text-brand-secondary font-semibold">
                        {p.session}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-text-primary font-heading line-clamp-2 group-hover:text-brand-primary transition-colors">
                    {p.title}
                  </h3>
                </div>

                <div className="pt-4 mt-4 border-t border-surface-border/80 flex items-center justify-between">
                  <Link
                    href={`/subjects/${p.code}`}
                    className="text-[11px] font-mono text-text-secondary hover:text-brand-primary transition-colors flex items-center gap-1"
                  >
                    <span>View Syllabus</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>

                  <a
                    href={dlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-3.5 py-1.5 text-xs font-bold text-background-dark shadow-solar-glow hover:bg-brand-primary/90 transition-all font-mono"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download PDF</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-surface-border bg-surface-dark p-12 text-center text-text-secondary font-mono text-xs">
          No question papers found matching your criteria.
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4 font-mono">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-xl border border-surface-border bg-surface-dark px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-brand-primary disabled:opacity-40 transition-colors"
          >
            &larr; Previous Page
          </button>
          <span className="text-xs text-text-secondary px-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-xl border border-surface-border bg-surface-dark px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-brand-primary disabled:opacity-40 transition-colors"
          >
            Next Page &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
