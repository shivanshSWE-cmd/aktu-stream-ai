"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, CheckCircle2, ChevronRight, Layers, Sparkles, Video as VideoIcon } from "lucide-react";
import { VideoCard } from "@/components/video/VideoCard";
import { api } from "@/lib/api";
import { Subject, Unit, Video } from "@/lib/types";

export default function SubjectDetailPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [selectedUnitNumber, setSelectedUnitNumber] = useState<number>(1);
  const [unitVideos, setUnitVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingVideos, setLoadingVideos] = useState<boolean>(false);

  useEffect(() => {
    async function loadSubject() {
      if (!code) return;
      try {
        setLoading(true);
        const data = await api.getSubjectDetail(code);
        setSubject(data);
      } catch (err) {
        console.error("Failed to load subject detail:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSubject();
  }, [code]);

  useEffect(() => {
    async function loadVideos() {
      if (!code || !selectedUnitNumber) return;
      try {
        setLoadingVideos(true);
        const vids = await api.getUnitVideos(code, selectedUnitNumber);
        setUnitVideos(vids);
      } catch (err) {
        console.error("Failed to load unit videos:", err);
        setUnitVideos([]);
      } finally {
        setLoadingVideos(false);
      }
    }
    loadVideos();
  }, [code, selectedUnitNumber]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        Loading syllabus and unit specifications...
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="rounded-2xl border border-gray-800 p-12 text-center text-gray-400">
        <h2 className="text-xl font-bold text-white">Subject Not Found</h2>
        <p className="mt-2 text-sm">Subject with code &apos;{code}&apos; is not registered in the AKTU syllabus database.</p>
        <Link href="/subjects" className="mt-4 inline-block text-indigo-400 hover:underline text-sm font-semibold">
          &larr; Back to Curriculum Directory
        </Link>
      </div>
    );
  }

  const currentUnit = subject.units?.find((u) => u.unit_number === selectedUnitNumber);

  return (
    <div className="space-y-8">
      {/* Breadcrumb & Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <Link href="/subjects" className="hover:text-indigo-400">Curriculum</Link>
          <ChevronRight className="h-3 w-3" />
          <span>{subject.branch_code}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-indigo-400 font-bold">{subject.code}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="rounded-md bg-indigo-600/20 px-3 py-1 text-sm font-extrabold text-indigo-300 border border-indigo-500/30">
                {subject.code}
              </span>
              <span className="text-xs font-semibold text-gray-400">
                Semester {subject.semester} • {subject.branch_code} Branch
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {subject.name}
            </h1>
          </div>
        </div>
      </div>

      {/* 5 Units Tabs Switcher */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-2">
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((uNum) => {
            const uObj = subject.units?.find((u) => u.unit_number === uNum);
            const isSelected = selectedUnitNumber === uNum;
            return (
              <button
                key={uNum}
                onClick={() => setSelectedUnitNumber(uNum)}
                className={`flex flex-col items-center justify-center rounded-xl p-3 text-center transition-all ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/40"
                    : "bg-gray-900/80 text-gray-400 hover:text-white hover:bg-gray-800/80"
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider">Unit {uNum}</span>
                <span className="hidden sm:inline-block mt-0.5 text-[11px] truncate max-w-[120px] font-medium opacity-85">
                  {uObj?.title || `Unit ${uNum}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Unit Syllabus Overview Card */}
      {currentUnit && (
        <div className="rounded-2xl border border-gray-800 bg-gradient-to-r from-gray-900/90 via-gray-900/60 to-gray-950 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">
                Unit {currentUnit.unit_number}: {currentUnit.title}
              </h2>
            </div>
            <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-300 border border-indigo-500/20">
              Syllabus Unit Interval: 1-5
            </span>
          </div>

          {currentUnit.summary && (
            <p className="text-xs text-gray-300">{currentUnit.summary}</p>
          )}

          {/* Topics Covered Tag Cloud */}
          {currentUnit.topics && currentUnit.topics.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Official AKTU Topics:
              </span>
              <div className="flex flex-wrap gap-2">
                {currentUnit.topics.map((topic, idx) => (
                  <span
                    key={idx}
                    className="rounded-lg bg-gray-800/90 border border-gray-700/60 px-2.5 py-1 text-xs text-gray-200"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Verified Unit Lectures Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <VideoIcon className="h-5 w-5 text-cyan-400" />
            Verified Lecture Streams for Unit {selectedUnitNumber}
          </h2>
          <span className="text-xs text-gray-400">
            {unitVideos.length} {unitVideos.length === 1 ? "lecture" : "lectures"} available
          </span>
        </div>

        {loadingVideos ? (
          <div className="py-12 text-center text-sm text-gray-400">
            Fetching verified video streams...
          </div>
        ) : unitVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {unitVideos.map((vid) => (
              <VideoCard key={vid.id} video={vid} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-800 p-10 text-center space-y-3">
            <p className="text-sm text-gray-400">
              No videos ingested for Unit {selectedUnitNumber} yet.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/upload"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Upload Student MP4
              </Link>
              <Link
                href="/admin/ingestion"
                className="rounded-lg border border-gray-700 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-800"
              >
                Trigger Channel Ingest
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
