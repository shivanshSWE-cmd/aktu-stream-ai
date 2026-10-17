"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, Filter, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Subject } from "@/lib/types";

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
        const data = await api.getSubjects(branchParam, semParam);
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <BookOpen className="h-7 w-7 text-indigo-400" />
          AKTU B.Tech Curriculum Directory
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Explore complete syllabus units (Unit 1 to 5) strictly mapped to official AKTU course codes.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-center gap-4 rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Filter by subject code (BCS501, BAS101) or title..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full rounded-xl border border-gray-800 bg-gray-950 py-2 pl-10 pr-4 text-xs sm:text-sm text-gray-200 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Branch Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {["ALL", "CSE", "IT", "AIML", "ECE", "ME", "CE"].map((b) => (
            <button
              key={b}
              onClick={() => setSelectedBranch(b)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedBranch === b
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800/80 text-gray-400 hover:text-white"
              }`}
            >
              {b}
            </button>
          ))}
        </div>

        {/* Semester Selector */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedSemester("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedSemester === "ALL"
                ? "bg-cyan-600 text-white"
                : "bg-gray-800/80 text-gray-400 hover:text-white"
            }`}
          >
            All Sems
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
            <button
              key={sem}
              onClick={() => setSelectedSemester(sem)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                selectedSemester === sem
                  ? "bg-cyan-600 text-white"
                  : "bg-gray-800/80 text-gray-400 hover:text-white"
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
            className="group flex flex-col justify-between rounded-2xl border border-gray-800 bg-gray-900/40 p-5 hover:border-indigo-500/50 hover:bg-gray-900 transition-all duration-200 hover:shadow-xl"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="rounded bg-indigo-500/20 px-2.5 py-1 text-xs font-bold text-indigo-300 border border-indigo-500/30">
                  {subj.code}
                </span>
                <span className="text-xs text-gray-400 font-medium">Semester {subj.semester}</span>
              </div>
              <h2 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                {subj.name}
              </h2>
              <p className="mt-2 text-xs text-gray-400 line-clamp-2">
                Contains Units 1, 2, 3, 4, and 5 syllabus topics with verified video streams.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-gray-800/80 pt-3 text-xs font-semibold text-indigo-400">
              <span>View 5 Units & Streams</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
