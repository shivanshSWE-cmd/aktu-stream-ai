"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Brain,
  Cpu,
  GraduationCap,
  Layers,
  Sparkles,
  UploadCloud,
  ShieldCheck,
} from "lucide-react";

interface SidebarNavProps {
  currentBranch?: string;
  currentSemester?: number;
}

const BRANCHES = [
  { code: "CSE", name: "Computer Science & Engg." },
  { code: "AIML", name: "Artificial Intelligence & ML" },
  { code: "IT", name: "Information Technology" },
  { code: "ECE", name: "Electronics & Communication" },
  { code: "ME", name: "Mechanical Engineering" },
  { code: "CE", name: "Civil Engineering" },
];

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export function SidebarNav({ currentBranch = "CSE", currentSemester = 5 }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <aside className="w-full lg:w-64 shrink-0 space-y-6">
      {/* AI Specialization Highlight Card */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/50 to-purple-950/30 p-4 shadow-lg shadow-indigo-500/5">
        <div className="flex items-center gap-2 text-indigo-400 mb-2">
          <Brain className="h-4 w-4" />
          <span className="text-xs font-bold tracking-wide uppercase">Dedicated Track</span>
        </div>
        <h4 className="text-sm font-bold text-white">AI & ML Foundations</h4>
        <p className="text-xs text-gray-300 mt-1">
          Math for ML, Deep Learning, Transformers & LLM Architectures.
        </p>
        <Link
          href="/ai-track"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          <Sparkles className="h-3 w-3" />
          Open AI Track
        </Link>
      </div>

      {/* Engineering Branches */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-indigo-400" />
            B.Tech Branches
          </span>
          <span className="text-[10px] text-gray-500 font-mono">AKTU</span>
        </div>

        <div className="space-y-1">
          {BRANCHES.map((b) => {
            const isActive = currentBranch === b.code;
            return (
              <Link
                key={b.code}
                href={`/subjects?branch=${b.code}&semester=${currentSemester}`}
                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold"
                    : "text-gray-400 hover:bg-gray-800/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Cpu className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span className="truncate">{b.name}</span>
                </div>
                <span className="text-[10px] font-mono text-gray-500 ml-1">{b.code}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Semester Selector Grid */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 space-y-3">
        <div className="border-b border-gray-800/80 pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-cyan-400" />
            Select Semester
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {SEMESTERS.map((sem) => {
            const isActive = currentSemester === sem;
            return (
              <Link
                key={sem}
                href={`/subjects?branch=${currentBranch}&semester=${sem}`}
                className={`rounded-lg py-1.5 text-center text-xs font-bold transition-all ${
                  isActive
                    ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                    : "bg-gray-950 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
                }`}
              >
                S{sem}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Navigation Quick Links */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4 space-y-2">
        <Link
          href="/upload"
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-emerald-400 transition-colors py-1"
        >
          <UploadCloud className="h-3.5 w-3.5 text-emerald-400" />
          <span>Student Lecture Upload</span>
        </Link>
        <Link
          href="/admin/ingestion"
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-indigo-400 transition-colors py-1"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
          <span>Quota & Ingestion Engine</span>
        </Link>
      </div>
    </aside>
  );
}
