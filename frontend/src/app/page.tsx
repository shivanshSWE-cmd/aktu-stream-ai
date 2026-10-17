"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle, Cpu, Layers, Sparkles, TrendingUp, Video as VideoIcon } from "lucide-react";
import { VideoCard } from "@/components/video/VideoCard";
import { api } from "@/lib/api";
import { Branch, Subject, Video } from "@/lib/types";

export default function HomePage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("CSE");
  const [selectedSemester, setSelectedSemester] = useState<number>(5);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [bData, sData, vData, stData] = await Promise.allSettled([
          api.getBranches(),
          api.getSubjects(selectedBranch, selectedSemester),
          api.getVideoDetail("sample").catch(() => null),
          api.getStats().catch(() => null),
        ]);

        if (bData.status === "fulfilled") setBranches(bData.value);
        if (sData.status === "fulfilled") setSubjects(sData.value);
        if (stData.status === "fulfilled") setStats(stData.value);

        // Fetch feed videos
        try {
          const res = await fetch("http://localhost:8000/api/v1/videos/?limit=6");
          if (res.ok) {
            const vids = await res.json();
            setRecentVideos(vids);
          }
        } catch {
          // Fallback initial video list if server not running during static phase
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedBranch, selectedSemester]);

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-gray-800 bg-gradient-to-b from-indigo-950/40 via-gray-900/60 to-gray-950 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>AKTU B.Tech Syllabus • Two-Stage AI Gatekeeper</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Stream Curated Engineering Lectures{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-cyan-400 bg-clip-text text-transparent">
              Unit by Unit.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
            AKTU Stream AI indexes verified YouTube lectures and native student MP4s across CSE, IT, AI & ML, ECE, ME, and CE. Every video is verified by our Two-Stage AI Classifier to guarantee official syllabus alignment.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link
              href="/subjects"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all"
            >
              <BookOpen className="h-4 w-4" />
              Explore Curriculum Directory
            </Link>

            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900/80 px-5 py-3 text-sm font-semibold text-gray-200 hover:bg-gray-800 transition-all"
            >
              <VideoIcon className="h-4 w-4 text-emerald-400" />
              Upload Student Lecture (HLS)
            </Link>
          </div>
        </div>

        {/* Live System Stats Pill Grid */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-gray-800/80 pt-6">
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 font-medium">Curriculum Units</span>
            <span className="text-xl font-bold text-white mt-0.5">5 Units / Subj</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 font-medium">Gatekeeper Filter</span>
            <span className="text-xl font-bold text-cyan-400 mt-0.5">Confidence ≥ 70%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 font-medium">Quota Efficiency</span>
            <span className="text-xl font-bold text-emerald-400 mt-0.5">1 Unit/Call (UU)</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 font-medium">Video Delivery</span>
            <span className="text-xl font-bold text-indigo-400 mt-0.5">Multi-Bitrate HLS</span>
          </div>
        </div>
      </section>

      {/* Branch & Semester Taxonomy Selector */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-400" />
              Academic Stream Navigator
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Select your engineering branch and semester to stream lectures by Unit 1 to 5
            </p>
          </div>

          {/* Semester Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <button
                key={sem}
                onClick={() => setSelectedSemester(sem)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedSemester === sem
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                Sem {sem}
              </button>
            ))}
          </div>
        </div>

        {/* Branch Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {["CSE", "IT", "AIML", "ECE", "ME", "CE", "ALL"].map((bCode) => (
            <button
              key={bCode}
              onClick={() => setSelectedBranch(bCode)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedBranch === bCode
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/20 border border-indigo-400/30"
                  : "bg-gray-900/90 border border-gray-800 text-gray-300 hover:border-gray-700 hover:bg-gray-800"
              }`}
            >
              <Cpu className="h-3.5 w-3.5 text-indigo-400" />
              {bCode}
            </button>
          ))}
        </div>

        {/* Subjects List for Selected Branch & Semester */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.length > 0 ? (
            subjects.map((subj) => (
              <Link
                key={subj.code}
                href={`/subjects/${subj.code}`}
                className="group flex flex-col justify-between rounded-2xl border border-gray-800 bg-gray-900/60 p-5 hover:border-indigo-500/50 hover:bg-gray-900 transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="rounded bg-indigo-500/20 px-2.5 py-1 font-bold text-indigo-300 border border-indigo-500/30">
                      {subj.code}
                    </span>
                    <span className="text-gray-400 font-medium">Semester {subj.semester}</span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {subj.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                    Official AKTU curriculum module containing 5 distinct syllabus units with lecture videos.
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-gray-800/80 pt-3 text-xs">
                  <span className="text-cyan-400 font-medium">5 Units Available</span>
                  <span className="font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
                    Explore Units &rarr;
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-gray-800 p-8 text-center text-sm text-gray-500">
              No subjects listed for {selectedBranch} in Semester {selectedSemester}. Try selecting another semester or branch.
            </div>
          )}
        </div>
      </section>

      {/* Verified Stream Feed */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
              Verified Stream Feed
            </h2>
            <p className="text-xs text-gray-400">
              Recent lectures approved by the Two-Stage Gatekeeper AI Classifier
            </p>
          </div>
          <Link href="/subjects" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
            View All &rarr;
          </Link>
        </div>

        {recentVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-8 text-center text-sm text-gray-400">
            <p>Ingestion engine standing by. Visit the Ingestion Hub to ingest latest lectures from whitelisted channels!</p>
            <Link
              href="/admin/ingestion"
              className="mt-3 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Open Ingestion Hub
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
