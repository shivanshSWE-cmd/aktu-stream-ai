"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronRight, Layers, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Subject, Video } from "@/types";
import { UnitTabs } from "@/components/syllabus/UnitTabs";
import { SidebarNav } from "@/components/layout/SidebarNav";

interface BranchSubjectPageProps {
  params: {
    branchId: string;
    semId: string;
    subjectCode: string;
  };
}

export default function BranchSubjectPage({ params }: BranchSubjectPageProps) {
  const { branchId, semId, subjectCode } = params;
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
    async function loadSubjectData() {
      try {
        setLoading(true);
        setError(null);

        const decodedSubjectCode = decodeURIComponent(subjectCode);
        const subj = await apiClient.getSubjectDetail(decodedSubjectCode);
        setSubject(subj);

        // Fetch videos for Unit 1 to 5 concurrently
        const unitPromises = [1, 2, 3, 4, 5].map((u) =>
          apiClient.getUnitVideos(decodedSubjectCode, u).catch(() => [] as Video[])
        );
        const results = await Promise.all(unitPromises);

        const vMap: Record<number, Video[]> = {};
        results.forEach((vids, idx) => {
          vMap[idx + 1] = vids;
        });
        setVideosByUnit(vMap);
      } catch (err: any) {
        setError(err.message || "Failed to load subject syllabus");
      } finally {
        setLoading(false);
      }
    }

    if (subjectCode) {
      loadSubjectData();
    }
  }, [subjectCode]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
        <p className="text-xs font-mono text-text-secondary">Loading syllabus units and verified lecture streams...</p>
      </div>
    );
  }

  if (error || !subject) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-surface-dark p-8 text-center space-y-4">
        <h3 className="text-base font-bold text-danger font-heading">Subject Syllabus Not Found</h3>
        <p className="text-xs text-text-secondary">
          {error || `Could not find subject code ${subjectCode} for ${branchId} Semester ${semId}.`}
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
      <SidebarNav currentBranch={branchId.toUpperCase()} currentSemester={Number(semId) || 5} />

      {/* Main Central Canvas (Flexible) */}
      <div className="flex-1 w-full space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-text-secondary font-mono">
          <Link href="/" className="hover:text-text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-surface-border" />
          <Link href={`/subjects?branch=${branchId}`} className="hover:text-text-primary transition-colors uppercase font-medium">
            {branchId}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-surface-border" />
          <Link href={`/subjects?branch=${branchId}&semester=${semId}`} className="hover:text-text-primary transition-colors">
            Semester {semId}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-surface-border" />
          <span className="font-bold text-brand-primary">{subject.code}</span>
        </nav>

        {/* Subject Hero Header */}
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
                {branchId.toUpperCase()}
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
