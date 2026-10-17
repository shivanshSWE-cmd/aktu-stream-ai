import Link from "next/link";
import { CheckCircle2, Clock, Eye, Play, Sparkles } from "lucide-react";
import { Video } from "@/types";
import { formatDuration } from "@/lib/utils";

interface VideoCardProps {
  video: Video;
  progressPercent?: number;
}

export function VideoCard({ video, progressPercent }: VideoCardProps) {
  const confidencePercentage = video.classification
    ? Math.round(video.classification.confidence * 100)
    : 95;

  return (
    <Link
      href={`/watch/${video.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900/60 hover:border-indigo-500/50 hover:bg-gray-900 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/10"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-950">
        <img
          src={video.thumbnail_url || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80"}
          alt={video.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Duration Badge */}
        {video.duration_seconds > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/80 px-2 py-0.5 text-[11px] font-medium text-gray-200 backdrop-blur-sm">
            <Clock className="h-3 w-3 text-gray-400" />
            {formatDuration(video.duration_seconds)}
          </div>
        )}

        {/* Source Badge & Unit Badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm ${
              video.source_type === "NATIVE"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-red-500/20 text-red-300 border border-red-500/30"
            }`}
          >
            {video.source_type === "NATIVE" ? "HLS Master" : "YouTube"}
          </span>

          {video.classification?.unit_number && (
            <span className="rounded bg-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-200 border border-indigo-400/30 backdrop-blur-sm">
              Unit {video.classification.unit_number}
            </span>
          )}
        </div>

        {/* Watch Progress Indicator */}
        {progressPercent !== undefined && progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
            <div
              className="h-full bg-indigo-500"
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
        )}

        {/* Hover Play Button */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/40">
            <Play className="h-5 w-5 fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Meta Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Subject & Confidence Header */}
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
          <span className="font-semibold text-indigo-400">
            {video.classification?.subject_code || "AKTU"}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 rounded px-1.5 py-0.5">
            <Sparkles className="h-3 w-3" />
            <span>{confidencePercentage}% Match</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 text-sm font-semibold text-gray-100 group-hover:text-indigo-300 transition-colors">
          {video.title}
        </h3>

        {/* Summary Snippet */}
        {video.classification?.summary && (
          <p className="mt-1.5 line-clamp-2 text-xs text-gray-400">
            {video.classification.summary}
          </p>
        )}

        {/* Footer Metrics */}
        <div className="mt-auto pt-3 flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-800/60">
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>{video.view_count.toLocaleString()} views</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            <span>Gatekeeper Approved</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
