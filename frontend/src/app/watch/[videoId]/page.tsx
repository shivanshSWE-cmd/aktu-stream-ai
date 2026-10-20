"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileText,
  Sparkles,
  Tv,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Video } from "@/types";
import { UnifiedPlayer } from "@/components/player/UnifiedPlayer";
import { TranscriptViewer } from "@/components/player/TranscriptViewer";
import { useWatchProgress } from "@/hooks/useWatchProgress";
import { VideoCard } from "@/components/syllabus/VideoCard";

interface WatchPageProps {
  params: {
    videoId: string;
  };
}

export default function WatchPage({ params }: WatchPageProps) {
  const { videoId } = params;
  const [video, setVideo] = useState<Video | null>(null);
  const [nextVideos, setNextVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [seekTime, setSeekTime] = useState<number | null>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"transcript" | "syllabus">("transcript");

  const { initialPosition, isCompleted, updateProgress, markCompleted } =
    useWatchProgress(videoId);

  useEffect(() => {
    async function loadVideo() {
      if (!videoId) return;
      try {
        setLoading(true);
        const vid = await apiClient.getVideoDetail(videoId);
        setVideo(vid);

        // Record view asynchronously
        apiClient.recordView(videoId).catch(() => {});

        // Fetch sibling videos in the same subject & unit
        if (vid.classification?.subject_code && vid.classification?.unit_number) {
          try {
            const siblings = await apiClient.getUnitVideos(
              vid.classification.subject_code,
              vid.classification.unit_number
            );
            setNextVideos(siblings.filter((s) => s.id !== vid.id).slice(0, 4));
          } catch {
            // Non-blocking
          }
        }
      } catch (err) {
        console.error("Failed to load video:", err);
      } finally {
        setLoading(false);
      }
    }
    loadVideo();
  }, [videoId]);

  const handleTimeUpdate = (currentTime: number, duration: number) => {
    setCurrentPlaybackTime(currentTime);
    updateProgress(currentTime, duration);
  };

  const handleSeekFromTranscript = (timestamp: number) => {
    setSeekTime(timestamp);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
        <p className="text-xs font-mono text-text-secondary">Loading workstation player & synchronized transcript...</p>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-surface-dark p-8 text-center space-y-4">
        <h3 className="text-base font-bold text-danger font-heading">Lecture Not Found</h3>
        <p className="text-xs text-text-secondary">
          This lecture video does not exist or was rejected by the Gatekeeper AI filter.
        </p>
        <Link
          href="/subjects"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-background-dark shadow-solar-glow hover:bg-brand-primary/90 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Curriculum
        </Link>
      </div>
    );
  }

  const confidencePct = video.classification
    ? Math.round(video.classification.confidence * 100)
    : 95;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-text-secondary font-mono">
        <Link href="/" className="hover:text-text-primary transition-colors">
          Home
        </Link>
        <ChevronRight className="h-3 w-3 text-surface-border" />
        {video.classification?.subject_code ? (
          <>
            <Link
              href={`/subjects/${video.classification.subject_code}`}
              className="hover:text-text-primary transition-colors font-semibold text-brand-primary"
            >
              {video.classification.subject_code}
            </Link>
            <ChevronRight className="h-3 w-3 text-surface-border" />
            <span className="text-text-primary font-bold">Unit {video.classification.unit_number || 1}</span>
          </>
        ) : (
          <span className="text-text-primary">Stream Studio</span>
        )}
      </nav>

      {/* Desktop & Mobile Grid:
          - Desktop: Main Central Canvas (Flexible) + Right Collapsible Panel (360px)
          - Mobile: Sticky top player with tabbed sheet underneath
      */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Main Central Canvas (Flexible) */}
        <div className="flex-1 w-full space-y-5">
          {/* Sticky Player on Mobile, Standard on Desktop */}
          <div className="sticky top-16 z-20 lg:static bg-background-dark pb-2 lg:pb-0">
            <UnifiedPlayer
              video={video}
              seekTime={seekTime}
              initialStartTime={initialPosition}
              onTimeUpdate={handleTimeUpdate}
              onEnded={markCompleted}
            />
          </div>

          {/* Video Metadata Card */}
          <div className="rounded-2xl border border-surface-border bg-surface-dark p-6 space-y-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {video.classification?.subject_code && (
                    <span className="rounded-md bg-brand-primary/10 px-2.5 py-0.5 text-xs font-mono font-bold text-brand-primary border border-brand-primary/20">
                      {video.classification.subject_code}
                    </span>
                  )}
                  {video.classification?.unit_number && (
                    <span className="rounded-md bg-brand-secondary/10 px-2.5 py-0.5 text-xs font-mono font-bold text-brand-secondary border border-brand-secondary/20">
                      Unit {video.classification.unit_number}
                    </span>
                  )}
                  {isCompleted && (
                    <span className="rounded-md bg-success/10 px-2.5 py-0.5 text-xs font-mono font-bold text-success border border-success/30 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed
                    </span>
                  )}
                  <span className="text-xs font-mono text-text-secondary">
                    {video.source_type === "NATIVE" ? "Multi-Bitrate HLS" : "YouTube Ingestion"}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight font-heading">
                  {video.title}
                </h1>
              </div>

              {/* Gatekeeper Confidence Pill */}
              <div className="flex items-center gap-2.5 rounded-xl border border-brand-secondary/30 bg-background-dark px-3.5 py-2">
                <Sparkles className="h-4 w-4 text-brand-secondary" />
                <div>
                  <div className="text-xs font-mono font-bold text-brand-secondary">{confidencePct}% Match</div>
                  <div className="text-[10px] text-text-secondary">Gatekeeper AI Passed</div>
                </div>
              </div>
            </div>

            {/* Video Stats */}
            <div className="flex items-center justify-between text-xs font-mono text-text-secondary border-t border-surface-border pt-3.5">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-text-secondary" />
                  {video.view_count.toLocaleString()} views
                </span>
                <span className="text-success flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  AKTU Syllabus Matched
                </span>
              </div>
              <span>Uploaded {new Date(video.created_at).toLocaleDateString()}</span>
            </div>

            {/* AI Summary */}
            {video.classification?.summary && (
              <div className="rounded-xl border border-surface-border bg-background-dark/70 p-4 space-y-1.5">
                <span className="text-[11px] font-mono font-bold text-brand-primary uppercase tracking-wider block">
                  AI Syllabus Summary
                </span>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {video.classification.summary}
                </p>
              </div>
            )}

            {/* Topics Chips */}
            {video.classification?.topics_covered && video.classification.topics_covered.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-text-secondary uppercase tracking-wider block">
                  Exam Topics Covered:
                </span>
                <div className="flex flex-wrap gap-2">
                  {video.classification.topics_covered.map((t, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg bg-background-dark border border-surface-border px-2.5 py-1 text-[11px] text-text-secondary font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Collapsible Panel (Fixed 360px on Desktop, Underneath on Mobile) */}
        <div className="w-full lg:w-[360px] shrink-0 space-y-4">
          <div className="flex border-b border-surface-border bg-surface-dark rounded-t-2xl overflow-hidden">
            <button
              onClick={() => setActiveTab("transcript")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold border-b-2 transition-all font-mono ${
                activeTab === "transcript"
                  ? "border-brand-primary text-brand-primary bg-brand-primary/10"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Transcript</span>
            </button>
            <button
              onClick={() => setActiveTab("syllabus")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold border-b-2 transition-all font-mono ${
                activeTab === "syllabus"
                  ? "border-brand-secondary text-brand-secondary bg-brand-secondary/10"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Unit Lectures ({nextVideos.length})</span>
            </button>
          </div>

          <div className="h-[560px]">
            {activeTab === "transcript" ? (
              <TranscriptViewer
                transcript={video.transcript}
                currentTime={currentPlaybackTime}
                onSeek={handleSeekFromTranscript}
              />
            ) : (
              <div className="rounded-b-2xl border border-surface-border bg-surface-dark p-4 space-y-3 h-full overflow-y-auto">
                <h3 className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider">
                  Next in Unit {video.classification?.unit_number || 1}
                </h3>
                {nextVideos.length > 0 ? (
                  <div className="space-y-3">
                    {nextVideos.map((nextVid) => (
                      <VideoCard key={nextVid.id} video={nextVid} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-surface-border p-6 text-center text-xs text-text-secondary font-mono">
                    No other videos in this unit currently.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
