"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Layers,
  Search,
  Sparkles,
  Tv,
} from "lucide-react";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { api } from "@/lib/api";
import { TranscriptSegment, Video } from "@/lib/types";

export default function WatchVideoPage() {
  const params = useParams();
  const videoId = params.id as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [seekTimestamp, setSeekTimestamp] = useState<number | null>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [activeTab, setActiveTab] = useState<"transcript" | "ai_notes">("transcript");
  const [transcriptFilter, setTranscriptFilter] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);

  const activeSegmentRef = useRef<HTMLDivElement>(null);
  const lastSavedTimeRef = useRef(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      let sId = localStorage.getItem("aktu_session_id");
      if (!sId) {
        sId = "user_" + Math.random().toString(36).substring(2, 10);
        localStorage.setItem("aktu_session_id", sId);
      }
      setSessionId(sId);
    }
  }, []);

  useEffect(() => {
    async function loadVideo() {
      if (!videoId) return;
      try {
        setLoading(true);
        const data = await api.getVideoDetail(videoId);
        setVideo(data);
        // Record view count
        api.recordView(videoId).catch(() => {});
      } catch (err) {
        console.error("Failed to load video detail:", err);
      } finally {
        setLoading(false);
      }
    }
    loadVideo();
  }, [videoId]);

  // Scroll active transcript line into view smoothly
  useEffect(() => {
    if (activeSegmentRef.current && activeTab === "transcript") {
      activeSegmentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [currentPlaybackTime, activeTab]);

  const handleTimeUpdate = (time: number) => {
    setCurrentPlaybackTime(time);
    // Periodically save progress every 10 seconds or on 90% completion
    if (Math.abs(time - lastSavedTimeRef.current) > 10 && videoId && sessionId) {
      lastSavedTimeRef.current = time;
      const completed = video?.duration_seconds ? time >= video.duration_seconds * 0.90 : false;
      if (completed) setIsCompleted(true);
      api.saveProgress(videoId, sessionId, time, completed).catch(() => {});
    }
  };

  const handleTranscriptLineClick = (startTime: number) => {
    setSeekTimestamp(startTime);
  };

  const formatTimestamp = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-sm text-gray-400">
        Loading enterprise video player and synchronized transcript...
      </div>
    );
  }

  if (!video) {
    return (
      <div className="rounded-2xl border border-gray-800 p-12 text-center text-gray-400">
        <h2 className="text-xl font-bold text-white">Lecture Not Found</h2>
        <p className="mt-2 text-sm">This video may not exist or has been flagged by the Gatekeeper.</p>
        <Link href="/" className="mt-4 inline-block text-indigo-400 hover:underline text-sm font-semibold">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  const segments = video.transcript?.segments || [];
  const filteredSegments = segments.filter((s) =>
    s.text.toLowerCase().includes(transcriptFilter.toLowerCase())
  );

  const confidencePct = video.classification
    ? Math.round(video.classification.confidence * 100)
    : 95;

  return (
    <div className="space-y-6">
      {/* Subject Header Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {video.classification?.subject_code && (
              <Link
                href={`/subjects/${video.classification.subject_code}`}
                className="rounded bg-indigo-500/20 px-2.5 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30"
              >
                {video.classification.subject_code}
              </Link>
            )}
            {video.classification?.unit_number && (
              <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-xs font-bold text-cyan-300 border border-cyan-500/20">
                Unit {video.classification.unit_number}
              </span>
            )}
            {isCompleted && (
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Completed
              </span>
            )}
            <span className="text-xs text-gray-400">
              {video.source_type === "NATIVE" ? "Native HLS Stream" : "YouTube Ingestion"}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {video.title}
          </h1>
        </div>

        {/* AI Confidence Indicator */}
        <div className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <div className="text-left">
            <div className="text-xs font-bold text-cyan-300">{confidencePct}% Match</div>
            <div className="text-[10px] text-gray-400">Gatekeeper AI Verified</div>
          </div>
        </div>
      </div>

      {/* Main Studio Grid: Video Player (Left 8 cols) + Transcript / Notes (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Player & Overview */}
        <div className="lg:col-span-8 space-y-4">
          <VideoPlayer
            video={video}
            seekTime={seekTimestamp}
            onTimeUpdate={handleTimeUpdate}
          />

          {/* Video Metadata & Metrics */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between text-xs text-gray-400 border-b border-gray-800/80 pb-3">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-gray-400" />
                  {video.view_count.toLocaleString()} views
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Approved Academic Content
                </span>
              </div>
              <span>Uploaded {new Date(video.created_at).toLocaleDateString()}</span>
            </div>

            {video.description && (
              <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                {video.description}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Transcript & AI Study Notes Tab */}
        <div className="lg:col-span-4 rounded-2xl border border-gray-800 bg-gray-900/70 overflow-hidden flex flex-col h-[580px]">
          {/* Tabs Header */}
          <div className="flex border-b border-gray-800 bg-gray-950/80">
            <button
              onClick={() => setActiveTab("transcript")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold border-b-2 transition-colors ${
                activeTab === "transcript"
                  ? "border-indigo-500 text-indigo-400 bg-indigo-500/10"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Sync Transcript ({segments.length})
            </button>
            <button
              onClick={() => setActiveTab("ai_notes")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold border-b-2 transition-colors ${
                activeTab === "ai_notes"
                  ? "border-cyan-500 text-cyan-400 bg-cyan-500/10"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Notes
            </button>
          </div>

          {/* Tab 1: Synchronized Transcript */}
          {activeTab === "transcript" && (
            <div className="flex flex-col flex-1 overflow-hidden p-3">
              {/* Transcript Search Filter */}
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Filter transcript keywords..."
                  value={transcriptFilter}
                  onChange={(e) => setTranscriptFilter(e.target.value)}
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 py-1.5 pl-8 pr-3 text-xs text-gray-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Scrollable Segment Items */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {filteredSegments.length > 0 ? (
                  filteredSegments.map((seg, idx) => {
                    const isCurrent =
                      currentPlaybackTime >= seg.start &&
                      currentPlaybackTime < seg.start + (seg.duration || 5);
                    return (
                      <div
                        key={idx}
                        ref={isCurrent ? activeSegmentRef : null}
                        onClick={() => handleTranscriptLineClick(seg.start)}
                        className={`group flex items-start gap-2.5 rounded-lg p-2 text-xs cursor-pointer transition-all ${
                          isCurrent
                            ? "bg-indigo-600/30 border border-indigo-500/50 text-white font-medium shadow-sm"
                            : "hover:bg-gray-800/60 text-gray-300"
                        }`}
                      >
                        <span className="font-mono text-[11px] text-cyan-400 bg-cyan-950/60 rounded px-1.5 py-0.5 whitespace-nowrap mt-0.5">
                          {formatTimestamp(seg.start)}
                        </span>
                        <p className="flex-1 leading-relaxed text-gray-200 group-hover:text-white">
                          {seg.text}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-xs text-gray-500">
                    {transcriptFilter
                      ? "No matching transcript lines."
                      : "Captions are being synchronized or unavailable."}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: AI Study Notes */}
          {activeTab === "ai_notes" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {video.classification ? (
                <>
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                      Academic Summary
                    </span>
                    <p className="text-xs text-gray-300 leading-relaxed bg-gray-950/60 p-3 rounded-xl border border-gray-800/80">
                      {video.classification.summary || "No summary generated."}
                    </p>
                  </div>

                  {video.classification.topics_covered && video.classification.topics_covered.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                        Key Exam Topics
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {video.classification.topics_covered.map((t, i) => (
                          <span
                            key={i}
                            className="rounded bg-gray-800 border border-gray-700/60 px-2 py-0.5 text-[11px] text-gray-200"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 border-t border-gray-800/80 pt-3">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Taxonomy Classification
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded bg-gray-950 p-2 border border-gray-800">
                        <span className="text-gray-500 text-[10px] block">Subject Code</span>
                        <span className="font-bold text-white">
                          {video.classification.subject_code}
                        </span>
                      </div>
                      <div className="rounded bg-gray-950 p-2 border border-gray-800">
                        <span className="text-gray-500 text-[10px] block">Unit Number</span>
                        <span className="font-bold text-white">
                          Unit {video.classification.unit_number} (Interval 1-5)
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-400 text-center py-8">
                  Classification details processing.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
