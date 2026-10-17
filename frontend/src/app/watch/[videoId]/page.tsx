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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="text-xs text-gray-400">Loading studio player & bilingual transcript...</p>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-8 text-center space-y-4">
        <h3 className="text-base font-bold text-red-400">Lecture Not Found</h3>
        <p className="text-xs text-gray-300">
          This lecture video does not exist or was rejected by the Gatekeeper AI filter.
        </p>
        <Link
          href="/subjects"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
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
      <nav className="flex items-center gap-2 text-xs text-gray-400">
        <Link href="/" className="hover:text-white transition-colors">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
        {video.classification?.subject_code ? (
          <>
            <Link
              href={`/subjects/${video.classification.subject_code}`}
              className="hover:text-white transition-colors font-medium text-indigo-400"
            >
              {video.classification.subject_code}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
            <span>Unit {video.classification.unit_number || 1}</span>
          </>
        ) : (
          <span>Stream</span>
        )}
      </nav>

      {/* Main Studio Grid: Player (8 cols) & Transcript/Syllabus (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Player & Overview */}
        <div className="lg:col-span-8 space-y-4">
          <UnifiedPlayer
            video={video}
            seekTime={seekTime}
            initialStartTime={initialPosition}
            onTimeUpdate={handleTimeUpdate}
            onEnded={markCompleted}
          />

          {/* Title and Gatekeeper Verification Badge */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {video.classification?.subject_code && (
                    <span className="rounded bg-indigo-500/20 px-2.5 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-500/30">
                      {video.classification.subject_code}
                    </span>
                  )}
                  {video.classification?.unit_number && (
                    <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-xs font-bold text-cyan-300 border border-cyan-500/20">
                      Unit {video.classification.unit_number}
                    </span>
                  )}
                  {isCompleted && (
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Completed
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {video.source_type === "NATIVE" ? "Multi-Bitrate HLS" : "YouTube Stream"}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {video.title}
                </h1>
              </div>

              {/* Gatekeeper Confidence Pill */}
              <div className="flex items-center gap-2.5 rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <div>
                  <div className="text-xs font-bold text-cyan-300">{confidencePct}% Match</div>
                  <div className="text-[10px] text-gray-400">Gatekeeper Verified</div>
                </div>
              </div>
            </div>

            {/* Video Stats */}
            <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-800/80 pt-3">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-gray-400" />
                  {video.view_count.toLocaleString()} views
                </span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  AKTU Syllabus Matched
                </span>
              </div>
              <span>Uploaded {new Date(video.created_at).toLocaleDateString()}</span>
            </div>

            {/* AI Summary */}
            {video.classification?.summary && (
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3.5 space-y-1">
                <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">
                  AI Syllabus Summary
                </span>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {video.classification.summary}
                </p>
              </div>
            )}

            {/* Topics Chips */}
            {video.classification?.topics_covered && video.classification.topics_covered.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-gray-400">Exam Topics Covered:</span>
                <div className="flex flex-wrap gap-1.5">
                  {video.classification.topics_covered.map((t, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-gray-800 border border-gray-700/60 px-2 py-0.5 text-[11px] text-gray-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Synchronized Transcript & Syllabus Units */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex border-b border-gray-800 bg-gray-900/60 rounded-t-2xl overflow-hidden">
            <button
              onClick={() => setActiveTab("transcript")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === "transcript"
                  ? "border-indigo-500 text-indigo-400 bg-indigo-500/10"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Interactive Transcript</span>
            </button>
            <button
              onClick={() => setActiveTab("syllabus")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === "syllabus"
                  ? "border-cyan-500 text-cyan-400 bg-cyan-500/10"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Unit Lectures ({nextVideos.length})</span>
            </button>
          </div>

          {activeTab === "transcript" ? (
            <TranscriptViewer
              transcript={video.transcript}
              currentTime={currentPlaybackTime}
              onSeek={handleSeekFromTranscript}
            />
          ) : (
            <div className="rounded-b-2xl border border-gray-800 bg-gray-900/60 p-4 space-y-3 max-h-[520px] overflow-y-auto">
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Next in Unit {video.classification?.unit_number || 1}
              </h3>
              {nextVideos.length > 0 ? (
                <div className="space-y-3">
                  {nextVideos.map((nextVid) => (
                    <VideoCard key={nextVid.id} video={nextVid} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-800 p-6 text-center text-xs text-gray-500">
                  No other videos in this unit currently.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
