"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Clock, Search, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { SearchResultItem } from "@/lib/types";

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
      const res = await api.semanticSearch(searchTerm.trim());
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
        <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300 mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          <span>pgvector Cosine Similarity • Deep Transcript Indexing</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Semantic Concept Search
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Search across all lecture transcripts and syllabus units to jump straight to the exact second a topic is explained.
        </p>
      </div>

      <form onSubmit={onSubmit} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search any engineering concept (e.g. relational algebra, AVL rotations, Banker's algorithm)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-2xl border border-gray-800 bg-gray-900/90 py-3.5 pl-12 pr-28 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {/* Results List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">
            Running pgvector semantic similarity search...
          </div>
        ) : results.length > 0 ? (
          results.map((item, idx) => (
            <Link
              key={idx}
              href={`/watch/${item.video_id}?t=${Math.floor(item.timestamp_seconds || 0)}`}
              className="group block rounded-2xl border border-gray-800 bg-gray-900/60 p-5 hover:border-indigo-500/50 hover:bg-gray-900 transition-all duration-200"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {item.subject_code && (
                    <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-xs font-bold text-indigo-300">
                      {item.subject_code}
                    </span>
                  )}
                  {item.unit_number && (
                    <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-xs font-bold text-cyan-300">
                      Unit {item.unit_number}
                    </span>
                  )}
                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {item.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-400 font-semibold">
                    {Math.round(item.similarity_score * 100)}% Match
                  </span>
                  <div className="flex items-center gap-1 rounded bg-indigo-600/20 border border-indigo-500/30 px-2 py-0.5 text-xs font-mono text-cyan-300">
                    <Clock className="h-3 w-3" />
                    <span>Jump to {formatTimestamp(item.timestamp_seconds)}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-300 bg-gray-950/60 p-3 rounded-xl border border-gray-800/80 leading-relaxed font-mono">
                &ldquo;{item.snippet}&rdquo;
              </p>
            </Link>
          ))
        ) : query ? (
          <div className="rounded-2xl border border-gray-800 p-8 text-center text-sm text-gray-400">
            No matching lecture transcripts found for &apos;{query}&apos;. Try searching for general terms like &apos;algebra&apos;, &apos;database&apos;, or &apos;sorting&apos;.
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function SemanticSearchPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-gray-400">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
