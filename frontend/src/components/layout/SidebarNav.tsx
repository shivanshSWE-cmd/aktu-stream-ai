"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
  { code: "AIML", name: "AI & Machine Learning" },
  { code: "IT", name: "Information Technology" },
  { code: "ECE", name: "Electronics & Comm." },
  { code: "ME", name: "Mechanical Engg." },
  { code: "CE", name: "Civil Engineering" },
];

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export function SidebarNav({ currentBranch = "CSE", currentSemester = 5 }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <aside className="w-full lg:w-[280px] shrink-0 space-y-5">
      {/* AI Specialization Dedicated Card */}
      <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-dark p-4 shadow-sm hover:border-brand-secondary/40 transition-all">
        <div className="flex items-center gap-2 text-brand-secondary mb-1.5">
          <Brain className="h-4 w-4" />
          <span className="text-[10px] font-bold tracking-wider uppercase font-mono">Specialized Track</span>
        </div>
        <h4 className="text-sm font-bold text-text-primary font-heading">AI & ML Foundations</h4>
        <p className="text-xs text-text-secondary mt-1 leading-relaxed">
          Math for ML, Deep Learning, Transformers & LLM Architectures.
        </p>
        <Link
          href="/ai-track"
          className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-brand-primary/10 border border-brand-primary/30 px-3 py-1.5 text-xs font-semibold text-brand-primary hover:bg-brand-primary/20 transition-all w-full justify-center"
        >
          <Sparkles className="h-3 w-3" />
          <span>Launch AI Track</span>
        </Link>
      </div>

      {/* Engineering Branches Tree */}
      <div className="rounded-2xl border border-surface-border bg-surface-dark p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-brand-primary" />
            Branch Hierarchy
          </span>
          <span className="text-[10px] text-text-secondary font-mono bg-background-dark px-1.5 py-0.5 rounded border border-surface-border">
            AKTU
          </span>
        </div>

        <div className="space-y-1">
          {BRANCHES.map((b) => {
            const isActive = currentBranch === b.code;
            return (
              <Link
                key={b.code}
                href={`/subjects?branch=${b.code}&semester=${currentSemester}`}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/30 font-semibold shadow-sm"
                    : "text-text-secondary hover:bg-background-dark hover:text-text-primary border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Cpu className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-brand-primary" : "text-text-secondary"}`} />
                  <span className="truncate">{b.name}</span>
                </div>
                <span className="text-[11px] font-mono text-text-secondary font-semibold ml-1">
                  {b.code}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Semester Selector Grid */}
      <div className="rounded-2xl border border-surface-border bg-surface-dark p-4 space-y-3">
        <div className="border-b border-surface-border pb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-brand-secondary" />
            Semester Filter
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {SEMESTERS.map((sem) => {
            const isActive = currentSemester === sem;
            return (
              <Link
                key={sem}
                href={`/subjects?branch=${currentBranch}&semester=${sem}`}
                className={`rounded-xl py-2 text-center text-xs font-mono font-bold transition-all ${
                  isActive
                    ? "bg-brand-secondary text-background-dark shadow-md shadow-brand-secondary/20"
                    : "bg-background-dark border border-surface-border text-text-secondary hover:text-text-primary hover:border-surface-border/80"
                }`}
              >
                S{sem}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Navigation Quick Links */}
      <div className="rounded-2xl border border-surface-border bg-surface-dark p-4 space-y-2">
        <Link
          href="/upload"
          className="flex items-center gap-2 text-xs text-text-secondary hover:text-success transition-colors py-1"
        >
          <UploadCloud className="h-3.5 w-3.5 text-success" />
          <span>Student Lecture Upload</span>
        </Link>
        <Link
          href="/admin/ingestion"
          className="flex items-center gap-2 text-xs text-text-secondary hover:text-brand-primary transition-colors py-1"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-brand-primary" />
          <span>Quota Engine Status</span>
        </Link>
      </div>
    </aside>
  );
}
