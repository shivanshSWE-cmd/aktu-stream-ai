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

  // Fallback unit meta if not explicitly provided
  const activeUnit = units.find((u) => u.unit_number === activeUnitNumber) || {
    id: `synthetic-${activeUnitNumber}`,
    subject_code: subjectCode,
    unit_number: activeUnitNumber,
    title: `Unit ${activeUnitNumber}: Core Syllabus Modules`,
    topics: ["Foundations & Definitions", "Analytical Techniques", "Numerical Formulations", "Solved Questions"],
    summary: `Official AKTU syllabus Unit ${activeUnitNumber} modules covering theoretical foundations, design methodologies, and exam problems.`,
    created_at: new Date().toISOString(),
  };

  const currentVideos = videosByUnit[activeUnitNumber] || [];

  return (
    <div className="space-y-6">
      {/* 5-Unit Tab Bar (Strictly 1 to 5) */}
      <div className="flex border-b border-gray-800 overflow-x-auto">
        {[1, 2, 3, 4, 5].map((uNum) => {
          const isActive = activeUnitNumber === uNum;
          const count = (videosByUnit[uNum] || []).length;

          return (
            <button
              key={uNum}
              onClick={() => setActiveUnitNumber(uNum)}
              className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? "border-indigo-500 text-indigo-400 bg-indigo-500/10"
                  : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Unit {uNum}</span>
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                  count > 0 ? "bg-indigo-500/20 text-indigo-300" : "bg-gray-800 text-gray-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Unit Header Card */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 space-y-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold mb-1">
            <span>Syllabus Breakdown</span>
            <span>•</span>
            <span>AKTU Unit {activeUnit.unit_number}</span>
          </div>
          <h2 className="text-xl font-bold text-white">{activeUnit.title}</h2>
          {activeUnit.summary && (
            <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">
              {activeUnit.summary}
            </p>
          )}
        </div>

        {/* Topics Chips */}
        {activeUnit.topics && activeUnit.topics.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-gray-400">Key Syllabus Topics:</span>
            <div className="flex flex-wrap gap-1.5">
              {activeUnit.topics.map((t, idx) => (
                <span
                  key={idx}
                  className="rounded-lg bg-gray-800/80 border border-gray-700/60 px-2.5 py-1 text-[11px] text-gray-300 font-medium"
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
          <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
            <span>Lectures & Numerical Walkthroughs</span>
            <span className="text-xs text-gray-400 font-normal">({currentVideos.length} videos)</span>
          </h3>
        </div>

        {currentVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {currentVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/30 p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-800/80 text-gray-400 mb-3">
              <BookOpen className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-gray-200">No Lectures Available for Unit {activeUnitNumber} Yet</h4>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              You can trigger the channel scraper in the Ingestion Hub or contribute by uploading student notes for this unit.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Link
                href="/upload"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Upload Lecture MP4
              </Link>
              <Link
                href="/admin/ingestion"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-700"
              >
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                Poll Whitelisted YouTube
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
