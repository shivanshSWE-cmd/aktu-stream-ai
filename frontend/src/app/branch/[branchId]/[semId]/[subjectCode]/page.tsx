"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronRight, Layers, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Subject, Video } from "@/types";
import { UnitTabs } from "@/components/syllabus/UnitTabs";

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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="text-xs text-gray-400">Loading syllabus units and verified lecture streams...</p>
      </div>
    );
  }

  if (error || !subject) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-8 text-center space-y-4">
        <h3 className="text-base font-bold text-red-400">Subject Syllabus Not Found</h3>
        <p className="text-xs text-gray-300">
          {error || `Could not find subject code ${subjectCode} for ${branchId} Semester ${semId}.`}
        </p>
        <Link
          href="/subjects"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Curriculum Directory
        </Link>
      </div>
    );
  }

  const totalVideos = Object.values(videosByUnit).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-gray-400">
        <Link href="/" className="hover:text-white transition-colors">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
        <Link href={`/subjects?branch=${branchId}`} className="hover:text-white transition-colors uppercase font-medium">
          {branchId}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
        <Link href={`/subjects?branch=${branchId}&semester=${semId}`} className="hover:text-white transition-colors">
          Semester {semId}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
        <span className="font-semibold text-indigo-400">{subject.code}</span>
      </nav>

      {/* Subject Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-gray-800 bg-gradient-to-r from-gray-900 via-indigo-950/40 to-gray-950 p-6 sm:p-8 shadow-xl">
        <div className="max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-indigo-600/30 border border-indigo-500/40 px-3 py-1 text-xs font-bold text-indigo-300">
              {subject.code}
            </span>
            <span className="rounded-lg bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-300">
              Semester {subject.semester}
            </span>
            <span className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-xs font-semibold text-cyan-300">
              {branchId.toUpperCase()}
            </span>
            <span className="text-xs text-emerald-400 font-medium ml-auto flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              {totalVideos} Verified Lectures
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {subject.name}
          </h1>

          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
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
  );
}
