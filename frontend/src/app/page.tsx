"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle, Cpu, Layers, Sparkles, TrendingUp, Video as VideoIcon } from "lucide-react";
import { VideoCard } from "@/components/syllabus/VideoCard";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { apiClient } from "@/lib/api-client";
import { Branch, Subject, Video } from "@/types";

export default function HomePage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("CSE");
  const [selectedSemester, setSelectedSemester] = useState<number>(5);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const [bData, sData] = await Promise.allSettled([
          apiClient.getBranches(),
          apiClient.getSubjects(selectedBranch, selectedSemester),
        ]);

        if (bData.status === "fulfilled") setBranches(bData.value);
        if (sData.status === "fulfilled") setSubjects(sData.value);

        // Fetch feed videos
        try {
          const res = await fetch("http://localhost:8000/api/v1/videos/?limit=6");
          if (res.ok) {
            const vids = await res.json();
            setRecentVideos(vids);
          }
        } catch {
          // Non-blocking
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [selectedBranch, selectedSemester]);

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* Left Sidebar (Fixed 280px on Desktop): Branch -> Semester Hierarchy */}
      <SidebarNav currentBranch={selectedBranch} currentSemester={selectedSemester} />

      {/* Main Central Canvas (Flexible) */}
      <div className="flex-1 w-full space-y-8">
        {/* Academic Hero Section */}
        <section className="relative overflow-hidden rounded-3xl border border-surface-border bg-surface-dark p-6 sm:p-10 shadow-sm">
          <div className="relative max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-primary/20 bg-brand-primary/10 px-3.5 py-1 text-xs font-mono font-semibold text-brand-primary">
              <Sparkles className="h-3.5 w-3.5 text-brand-secondary" />
              <span>AKTU B.Tech Syllabus • Two-Stage AI Content Gatekeeper</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-text-primary leading-tight font-heading">
              Curated Engineering Lectures{" "}
              <span className="text-brand-primary">
                Unit by Unit.
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Distraction-free academic workstation for Dr. A.P.J. Abdul Kalam Technical University. Automated channel scraping, Gemini AI syllabus classification, and adaptive multi-bitrate HLS streams.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/subjects"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-semibold text-text-primary shadow-sm hover:bg-brand-primary/90 transition-all"
              >
                <BookOpen className="h-4 w-4" />
                Explore Curriculum Directory
              </Link>

              <Link
                href="/upload"
                className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-background-dark px-4 py-2.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-surface-border/80 transition-all"
              >
                <VideoIcon className="h-4 w-4 text-success" />
                Upload Student MP4
              </Link>
            </div>
          </div>

          {/* Metric Pills */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-surface-border pt-6">
            <div className="flex flex-col">
              <span className="text-[11px] font-mono text-text-secondary">Curriculum Structure</span>
              <span className="text-base font-bold font-mono text-text-primary mt-0.5">5 Units / Subject</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-mono text-text-secondary">Gatekeeper Threshold</span>
              <span className="text-base font-bold font-mono text-brand-secondary mt-0.5">Confidence ≥ 70%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-mono text-text-secondary">YouTube API Quota</span>
              <span className="text-base font-bold font-mono text-success mt-0.5">1 Unit/Call (UU)</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-mono text-text-secondary">Adaptive Delivery</span>
              <span className="text-base font-bold font-mono text-brand-primary mt-0.5">1080p/720p/480p</span>
            </div>
          </div>
        </section>

        {/* Branch & Semester Taxonomy Selector */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-2 font-heading">
                <Layers className="h-4 w-4 text-brand-primary" />
                Academic Stream Navigator
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Select your engineering branch and semester to stream lectures by Unit 1 to 5
              </p>
            </div>

            {/* Semester Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <button
                  key={sem}
                  onClick={() => setSelectedSemester(sem)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-mono font-bold transition-all ${
                    selectedSemester === sem
                      ? "bg-brand-primary text-text-primary shadow-sm"
                      : "bg-surface-dark border border-surface-border text-text-secondary hover:text-text-primary hover:bg-surface-border"
                  }`}
                >
                  Sem {sem}
                </button>
              ))}
            </div>
          </div>

          {/* Branch Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {["CSE", "IT", "AIML", "ECE", "ME", "CE", "ALL"].map((bCode) => (
              <button
                key={bCode}
                onClick={() => setSelectedBranch(bCode)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                  selectedBranch === bCode
                    ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/30"
                    : "bg-surface-dark border border-surface-border text-text-secondary hover:border-surface-border/80 hover:text-text-primary"
                }`}
              >
                <Cpu className="h-3.5 w-3.5 text-brand-primary" />
                {bCode}
              </button>
            ))}
          </div>

          {/* Subjects List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.length > 0 ? (
              subjects.map((subj) => (
                <Link
                  key={subj.code}
                  href={`/subjects/${subj.code}`}
                  className="group flex flex-col justify-between rounded-2xl border border-surface-border bg-surface-dark p-5 hover:border-brand-primary/50 transition-all duration-200 hover:shadow-ambient-glow"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="rounded-md bg-brand-primary/10 px-2 py-0.5 font-mono font-bold text-brand-primary border border-brand-primary/20 text-[11px]">
                        {subj.code}
                      </span>
                      <span className="text-text-secondary font-mono text-[11px]">Semester {subj.semester}</span>
                    </div>
                    <h3 className="text-sm font-bold text-text-primary group-hover:text-brand-primary transition-colors font-heading">
                      {subj.name}
                    </h3>
                    <p className="text-xs text-text-secondary mt-2 line-clamp-2 leading-relaxed">
                      Official AKTU curriculum module containing 5 distinct syllabus units with lecture videos.
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-surface-border pt-3 text-xs font-mono">
                    <span className="text-brand-secondary text-[11px]">5 Units Available</span>
                    <span className="font-semibold text-brand-primary group-hover:translate-x-1 transition-transform">
                      Explore &rarr;
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full rounded-2xl border border-dashed border-surface-border p-8 text-center text-xs text-text-secondary font-mono">
                No subjects listed for {selectedBranch} in Semester {selectedSemester}. Select another branch or semester.
              </div>
            )}
          </div>
        </section>

        {/* Verified Stream Feed */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-2 font-heading">
                <TrendingUp className="h-4 w-4 text-brand-secondary" />
                Verified Academic Lectures
              </h2>
              <p className="text-xs text-text-secondary">
                Curriculum lectures verified with confidence score ≥ 70%
              </p>
            </div>
            <Link href="/subjects" className="text-xs font-mono font-semibold text-brand-primary hover:underline">
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
            <div className="rounded-2xl border border-surface-border bg-surface-dark p-8 text-center text-xs text-text-secondary">
              <p>Ingestion engine active. Visit the Ingestion Hub to poll whitelisted channels.</p>
              <Link
                href="/admin/ingestion"
                className="mt-3 inline-block rounded-xl bg-brand-primary px-4 py-2 text-xs font-semibold text-text-primary hover:bg-brand-primary/90"
              >
                Open Ingestion Hub
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
