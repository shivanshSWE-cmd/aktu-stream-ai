"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Clock, Search, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { SearchResultItem } from "@/types";

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialQuery.trim()) {
      handleSearch(initialQuery.trim());
    }
  }, [initialQuery]);

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    try {
      setLoading(true);
      const res = await apiClient.semanticSearch(searchTerm.trim());
      setResults(res.results);
    } catch (err) {
      console.error("Semantic search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const formatTimestamp = (secs?: number) => {
    if (secs === undefined || secs === null) return "0:00";
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header & Search Bar */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-secondary/30 bg-brand-secondary/10 px-3 py-1 text-xs font-mono font-semibold text-brand-secondary mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          <span>768-d pgvector Cosine Similarity • Deep Transcript Indexing</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight font-heading">
          Semantic Concept Search
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">
          Search across all lecture transcripts and syllabus units to jump straight to the exact second a topic is explained.
        </p>
      </div>

      <form onSubmit={onSubmit} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
        <input
          type="text"
          placeholder="Search any engineering concept (e.g. relational algebra, AVL rotations, Banker's algorithm)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-2xl border border-surface-border bg-surface-dark py-3.5 pl-12 pr-28 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none transition-all shadow-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-background-dark hover:bg-brand-primary/90 disabled:opacity-50 transition-all shadow-solar-glow font-mono"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {/* Results List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs font-mono text-text-secondary">
            Running pgvector cosine similarity search...
          </div>
        ) : results.length > 0 ? (
          results.map((item, idx) => (
            <Link
              key={idx}
              href={`/watch/${item.video_id}?t=${Math.floor(item.timestamp_seconds || 0)}`}
              className="group block rounded-2xl border border-surface-border bg-surface-dark p-5 hover:border-brand-primary/50 transition-all duration-200 hover:shadow-ambient-glow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {item.subject_code && (
                    <span className="rounded-md bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 text-xs font-mono font-bold text-brand-primary">
                      {item.subject_code}
                    </span>
                  )}
                  {item.unit_number && (
                    <span className="rounded-md bg-brand-secondary/10 border border-brand-secondary/20 px-2 py-0.5 text-xs font-mono font-bold text-brand-secondary">
                      Unit {item.unit_number}
                    </span>
                  )}
                  <h3 className="text-sm font-bold text-text-primary group-hover:text-brand-primary transition-colors font-heading">
                    {item.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-success font-semibold">
                    {Math.round(item.similarity_score * 100)}% Match
                  </span>
                  <div className="flex items-center gap-1 rounded-md bg-background-dark border border-surface-border px-2 py-0.5 text-xs font-mono text-brand-secondary">
                    <Clock className="h-3 w-3" />
                    <span>Jump to {formatTimestamp(item.timestamp_seconds)}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-text-secondary bg-background-dark p-3.5 rounded-xl border border-surface-border leading-relaxed font-mono">
                &ldquo;{item.snippet}&rdquo;
              </p>
            </Link>
          ))
        ) : query ? (
          <div className="rounded-2xl border border-dashed border-surface-border p-8 text-center text-xs font-mono text-text-secondary">
            No matching lecture transcripts found for &apos;{query}&apos;. Try general keywords like &apos;algebra&apos;, &apos;tree&apos;, or &apos;network&apos;.
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function SemanticSearchPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs font-mono text-text-secondary">Loading search workstation...</div>}>
      <SearchContent />
    </Suspense>
  );
}
