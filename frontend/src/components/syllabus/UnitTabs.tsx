"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle, Clock, Sparkles, UploadCloud } from "lucide-react";
import { Unit, Video } from "@/types";
import { VideoCard } from "@/components/syllabus/VideoCard";

interface UnitTabsProps {
  subjectCode: string;
  units?: Unit[];
  videosByUnit: Record<number, Video[]>;
}

export function UnitTabs({ subjectCode, units = [], videosByUnit }: UnitTabsProps) {
  const [activeUnitNumber, setActiveUnitNumber] = useState<number>(1);

  // Fallback unit meta
  const activeUnit = units.find((u) => u.unit_number === activeUnitNumber) || {
    id: `synthetic-${activeUnitNumber}`,
    subject_code: subjectCode,
    unit_number: activeUnitNumber,
    title: `Unit ${activeUnitNumber}: Core Syllabus Modules`,
    topics: ["Theoretical Foundations", "Analytical Formulations", "Design Methodologies", "Solved Examination Problems"],
    summary: `Official AKTU syllabus Unit ${activeUnitNumber} modules covering theoretical foundations, design methodologies, and previous year examination problems.`,
    created_at: new Date().toISOString(),
  };

  const currentVideos = videosByUnit[activeUnitNumber] || [];

  return (
    <div className="space-y-6">
      {/* 5-Unit Tab Bar (Strictly 1 to 5) */}
      <div className="flex border-b border-surface-border overflow-x-auto gap-1">
        {[1, 2, 3, 4, 5].map((uNum) => {
          const isActive = activeUnitNumber === uNum;
          const count = (videosByUnit[uNum] || []).length;

          return (
            <button
              key={uNum}
              onClick={() => setActiveUnitNumber(uNum)}
              className={`flex items-center gap-2.5 px-5 py-3.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap font-mono ${
                isActive
                  ? "border-brand-primary text-brand-primary bg-brand-primary/10"
                  : "border-transparent text-text-secondary hover:text-text-primary hover:border-surface-border"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Unit {uNum}</span>
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-mono ${
                  count > 0 ? "bg-brand-primary/20 text-brand-primary" : "bg-surface-border text-text-secondary"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Unit Header Card */}
      <div className="rounded-2xl border border-surface-border bg-surface-dark p-6 space-y-4 shadow-sm">
        <div className="space-y-2">
          {/* Unit Indicator Badge: Compact pill with subtle 10% opacity background */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 px-3 py-1 text-xs font-mono font-semibold text-brand-primary">
            <span>Unit {activeUnit.unit_number}: {activeUnit.title.replace(/^Unit \d+:\s*/, "")}</span>
          </div>

          <h2 className="text-xl font-bold text-text-primary font-heading tracking-tight">{activeUnit.title}</h2>
          {activeUnit.summary && (
            <p className="text-xs text-text-secondary leading-relaxed max-w-4xl">
              {activeUnit.summary}
            </p>
          )}
        </div>

        {/* Topics Chips */}
        {activeUnit.topics && activeUnit.topics.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-surface-border/80">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-secondary block">
              Syllabus Topics & Key Concepts:
            </span>
            <div className="flex flex-wrap gap-2">
              {activeUnit.topics.map((t, idx) => (
                <span
                  key={idx}
                  className="rounded-xl bg-background-dark border border-surface-border px-3 py-1 text-xs text-text-secondary font-medium hover:border-brand-primary/40 hover:text-text-primary transition-all"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Video Feed Grid for this Unit */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 font-heading">
            <span>Lectures & Numerical Walkthroughs</span>
            <span className="text-xs text-text-secondary font-mono font-normal">({currentVideos.length} videos)</span>
          </h3>
        </div>

        {currentVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {currentVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-surface-border bg-surface-dark/40 p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-dark border border-surface-border text-text-secondary mb-3">
              <BookOpen className="h-6 w-6 text-brand-primary" />
            </div>
            <h4 className="text-sm font-bold text-text-primary font-heading">
              No Lectures Ingested for Unit {activeUnitNumber} Yet
            </h4>
            <p className="text-xs text-text-secondary mt-1.5 max-w-sm mx-auto leading-relaxed">
              Trigger the channel scraper in the Ingestion Hub or upload student notes directly to start streaming.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Link
                href="/upload"
                className="inline-flex items-center gap-1.5 rounded-xl bg-success/15 border border-success/30 px-3.5 py-2 text-xs font-semibold text-success hover:bg-success/25 transition-all"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Upload Lecture MP4
              </Link>
              <Link
                href="/admin/ingestion"
                className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-dark px-3.5 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-surface-border/80 transition-all"
              >
                <Sparkles className="h-3.5 w-3.5 text-brand-secondary" />
                Poll Whitelisted YouTube
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
