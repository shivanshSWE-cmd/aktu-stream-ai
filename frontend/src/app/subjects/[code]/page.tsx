"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronRight, Layers, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Subject, Video } from "@/types";
import { UnitTabs } from "@/components/syllabus/UnitTabs";
import { SidebarNav } from "@/components/layout/SidebarNav";

export default function SubjectDetailPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [videosByUnit, setVideosByUnit] = useState<Record<number, Video[]>>({
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSubject() {
      if (!code) return;
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getSubjectDetail(code);
        setSubject(data);

        // Fetch videos for Unit 1 to 5 concurrently
        const unitPromises = [1, 2, 3, 4, 5].map((u) =>
          apiClient.getUnitVideos(code, u).catch(() => [] as Video[])
        );
        const results = await Promise.all(unitPromises);

        const vMap: Record<number, Video[]> = {};
        results.forEach((vids, idx) => {
          vMap[idx + 1] = vids;
        });
        setVideosByUnit(vMap);
      } catch (err: any) {
        setError(err.message || "Failed to load subject details");
      } finally {
        setLoading(false);
      }
    }
    loadSubject();
  }, [code]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
        <p className="text-xs font-mono text-text-secondary">Loading syllabus and unit specifications...</p>
      </div>
    );
  }

  if (error || !subject) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-surface-dark p-8 text-center space-y-4">
        <h3 className="text-base font-bold text-danger font-heading">Subject Not Found</h3>
        <p className="text-xs text-text-secondary">
          {error || `Subject with code '${code}' is not registered in the AKTU syllabus database.`}
        </p>
        <Link
          href="/subjects"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-background-dark hover:bg-brand-primary/90 transition-all shadow-solar-glow"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Curriculum Directory
        </Link>
      </div>
    );
  }

  const totalVideos = Object.values(videosByUnit).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* Left Sidebar (Fixed 280px): Branch -> Semester Hierarchy */}
      <SidebarNav currentBranch={subject.branch_code} currentSemester={subject.semester} />

      {/* Main Central Canvas (Flexible) */}
      <div className="flex-1 w-full space-y-6">
        {/* Breadcrumb & Header */}
        <nav className="flex items-center gap-2 text-xs text-text-secondary font-mono">
          <Link href="/subjects" className="hover:text-text-primary transition-colors">
            Curriculum
          </Link>
          <ChevronRight className="h-3 w-3 text-surface-border" />
          <span>{subject.branch_code}</span>
          <ChevronRight className="h-3 w-3 text-surface-border" />
          <span className="font-bold text-brand-primary">{subject.code}</span>
        </nav>

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-3xl border border-surface-border bg-surface-dark p-6 sm:p-8 shadow-sm">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-brand-primary/10 border border-brand-primary/20 px-3 py-1 text-xs font-mono font-bold text-brand-primary">
                {subject.code}
              </span>
              <span className="rounded-md bg-background-dark border border-surface-border px-3 py-1 text-xs font-mono font-semibold text-text-secondary">
                Semester {subject.semester}
              </span>
              <span className="rounded-md bg-brand-secondary/10 border border-brand-secondary/20 px-3 py-1 text-xs font-mono font-semibold text-brand-secondary">
                {subject.branch_code} Branch
              </span>
              <span className="text-xs font-mono text-success font-medium ml-auto flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                {totalVideos} Verified Lectures
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight font-heading">
              {subject.name}
            </h1>

            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Official Dr. A.P.J. Abdul Kalam Technical University curriculum covering 5 core syllabus units. Filter and stream unit-wise lectures verified with Two-Stage AI Gatekeeping.
            </p>

            {/* Quick links to Notes and PYQ Bank for this exact subject */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/notes"
                className="inline-flex items-center gap-1.5 rounded-xl bg-background-dark border border-surface-border px-3.5 py-1.5 text-xs font-mono font-semibold text-text-primary hover:border-brand-primary/50 transition-colors"
              >
                <span>📚 Subject Handwritten Notes</span>
              </Link>
              <Link
                href={`/pyqs?code=${encodeURIComponent(subject.code)}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-background-dark border border-surface-border px-3.5 py-1.5 text-xs font-mono font-semibold text-brand-secondary hover:border-brand-secondary/50 transition-colors"
              >
                <span>📄 Solved {subject.code} PYQs</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 5-Unit Tabs and Video Stream Grid */}
        <UnitTabs
          subjectCode={subject.code}
          units={subject.units}
          videosByUnit={videosByUnit}
        />
      </div>
    </div>
  );
}
