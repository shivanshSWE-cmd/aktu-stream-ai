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
      className="group flex flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface-dark hover:border-brand-primary/50 transition-all duration-200 hover:shadow-ambient-glow"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        <img
          src={video.thumbnail_url || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80"}
          alt={video.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-90 group-hover:opacity-100"
        />

        {/* Duration Badge - Monospaced */}
        {video.duration_seconds > 0 && (
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-md bg-black/85 px-2 py-0.5 text-[11px] font-mono font-medium text-text-primary backdrop-blur-sm border border-surface-border/60">
            <Clock className="h-3 w-3 text-text-secondary" />
            {formatDuration(video.duration_seconds)}
          </div>
        )}

        {/* Source Badge & Unit Indicator Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider backdrop-blur-sm ${
              video.source_type === "NATIVE"
                ? "bg-success/15 text-success border border-success/30"
                : "bg-danger/15 text-danger border border-danger/30"
            }`}
          >
            {video.source_type === "NATIVE" ? "HLS Master" : "YouTube"}
          </span>

          {video.classification?.unit_number && (
            <span className="rounded-md bg-brand-primary/10 px-2 py-0.5 text-[10px] font-mono font-bold text-brand-primary border border-brand-primary/20 backdrop-blur-sm">
              Unit {video.classification.unit_number}
            </span>
          )}
        </div>

        {/* Watch Progress Indicator */}
        {progressPercent !== undefined && progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface-border">
            <div
              className="h-full bg-brand-primary"
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
        )}

        {/* Hover Play Button */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-primary text-text-primary shadow-lg shadow-brand-primary/40">
            <Play className="h-4 w-4 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Meta Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Subject & Confidence Header */}
        <div className="flex items-center justify-between text-xs text-text-secondary mb-2">
          <span className="font-mono font-semibold text-brand-primary text-[11px]">
            {video.classification?.subject_code || "AKTU"}
          </span>
          <div className="flex items-center gap-1 text-[11px] font-mono text-brand-secondary bg-surface-dark border border-brand-secondary/30 rounded-md px-2 py-0.5">
            <Sparkles className="h-3 w-3" />
            <span>{confidencePercentage}% Match</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 text-sm font-semibold text-text-primary group-hover:text-brand-primary transition-colors font-heading leading-snug">
          {video.title}
        </h3>

        {/* Summary Snippet */}
        {video.classification?.summary && (
          <p className="mt-1.5 line-clamp-2 text-xs text-text-secondary leading-relaxed">
            {video.classification.summary}
          </p>
        )}

        {/* Footer Metrics */}
        <div className="mt-auto pt-3 flex items-center justify-between text-[11px] font-mono text-text-secondary border-t border-surface-border/80">
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>{video.view_count.toLocaleString()} views</span>
          </div>
          <div className="flex items-center gap-1 text-success">
            <CheckCircle2 className="h-3 w-3" />
            <span>Verified</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
