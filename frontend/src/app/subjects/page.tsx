"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, Filter, Search } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Subject } from "@/types";
import { SidebarNav } from "@/components/layout/SidebarNav";

export default function SubjectsDirectoryPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [selectedSemester, setSelectedSemester] = useState<number | "ALL">("ALL");
  const [searchFilter, setSearchFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubjects() {
      try {
        setLoading(true);
        const branchParam = selectedBranch === "ALL" ? undefined : selectedBranch;
        const semParam = selectedSemester === "ALL" ? undefined : selectedSemester;
        const data = await apiClient.getSubjects(branchParam, semParam);
        setSubjects(data);
      } catch (err) {
        console.error("Failed to load subjects:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSubjects();
  }, [selectedBranch, selectedSemester]);

  const filtered = subjects.filter((s) => {
    const q = searchFilter.toLowerCase();
    return (
      s.code.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.branch_code.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* Left Sidebar (Fixed 280px): Branch -> Semester Tree */}
      <SidebarNav
        currentBranch={selectedBranch === "ALL" ? "CSE" : selectedBranch}
        currentSemester={selectedSemester === "ALL" ? 5 : selectedSemester}
      />

      {/* Main Central Canvas (Flexible) */}
      <div className="flex-1 w-full space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight flex items-center gap-2.5 font-heading">
            <BookOpen className="h-6 w-6 text-brand-primary" />
            AKTU B.Tech Curriculum Directory
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Explore complete syllabus units (Unit 1 to 5) strictly mapped to official AKTU course codes.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row items-center gap-4 rounded-2xl border border-surface-border bg-surface-dark p-4 shadow-sm">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Filter by subject code (BCS501, BAS101) or title..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full rounded-xl border border-surface-border bg-background-dark py-2 pl-10 pr-4 text-xs font-mono text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none transition-all"
            />
          </div>

          {/* Branch Selector */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 font-mono">
            {["ALL", "CSE", "IT", "AIML", "ECE", "ME", "CE"].map((b) => (
              <button
                key={b}
                onClick={() => setSelectedBranch(b)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedBranch === b
                    ? "bg-brand-primary text-text-primary shadow-sm"
                    : "bg-surface-dark border border-surface-border text-text-secondary hover:text-text-primary hover:bg-surface-border"
                }`}
              >
                {b}
              </button>
            ))}
          </div>

          {/* Semester Selector */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 font-mono">
            <button
              onClick={() => setSelectedSemester("ALL")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedSemester === "ALL"
                  ? "bg-brand-secondary text-background-dark shadow-sm font-bold"
                  : "bg-surface-dark border border-surface-border text-text-secondary hover:text-text-primary hover:bg-surface-border"
              }`}
            >
              All
            </button>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <button
                key={sem}
                onClick={() => setSelectedSemester(sem)}
                className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  selectedSemester === sem
                    ? "bg-brand-secondary text-background-dark shadow-sm font-bold"
                    : "bg-surface-dark border border-surface-border text-text-secondary hover:text-text-primary hover:bg-surface-border"
                }`}
              >
                S{sem}
              </button>
            ))}
          </div>
        </div>

        {/* Grid of Subjects */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((subj) => (
            <Link
              key={subj.code}
              href={`/subjects/${subj.code}`}
              className="group flex flex-col justify-between rounded-2xl border border-surface-border bg-surface-dark p-5 hover:border-brand-primary/50 transition-all duration-200 hover:shadow-ambient-glow"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="rounded-md bg-brand-primary/10 border border-brand-primary/20 px-2.5 py-0.5 text-xs font-mono font-bold text-brand-primary">
                    {subj.code}
                  </span>
                  <span className="text-xs font-mono text-text-secondary font-medium">Semester {subj.semester}</span>
                </div>
                <h2 className="text-sm font-bold text-text-primary group-hover:text-brand-primary transition-colors font-heading">
                  {subj.name}
                </h2>
                <p className="mt-2 text-xs text-text-secondary line-clamp-2 leading-relaxed">
                  Contains Units 1, 2, 3, 4, and 5 syllabus topics with verified video streams.
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-surface-border pt-3 text-xs font-mono font-semibold text-brand-primary">
                <span>View 5 Units & Streams</span>
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
