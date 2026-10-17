"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Copy, Check, FileText, Search, Sparkles } from "lucide-react";
import { Transcript, TranscriptSegment } from "@/types";

interface TranscriptViewerProps {
  transcript?: Transcript;
  currentTime?: number;
  onSeek: (seconds: number) => void;
}

export function TranscriptViewer({
  transcript,
  currentTime = 0,
  onSeek,
}: TranscriptViewerProps) {
  const [filterText, setFilterText] = useState("");
  const [copied, setCopied] = useState(false);
  const activeSegmentRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const segments: TranscriptSegment[] = useMemo(() => {
    if (transcript?.segments && transcript.segments.length > 0) {
      return transcript.segments;
    }
    if (transcript?.full_text) {
      const sentences = transcript.full_text.split(". ");
      let t = 0;
      return sentences.map((s) => {
        const seg: TranscriptSegment = {
          start: t,
          duration: 15,
          text: s.trim() + ".",
        };
        t += 15;
        return seg;
      });
    }
    return [];
  }, [transcript]);

  // Find currently active segment
  const activeIndex = useMemo(() => {
    return segments.findIndex(
      (seg) => currentTime >= seg.start && currentTime < seg.start + (seg.duration || 10)
    );
  }, [segments, currentTime]);

  // Auto-scroll active segment smoothly
  useEffect(() => {
    if (activeSegmentRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const element = activeSegmentRef.current;
      const topPos = element.offsetTop - container.offsetTop - 100;
      container.scrollTo({
        top: Math.max(0, topPos),
        behavior: "smooth",
      });
    }
  }, [activeIndex]);

  const filteredSegments = useMemo(() => {
    if (!filterText.trim()) return segments;
    const q = filterText.toLowerCase();
    return segments.filter((s) => s.text.toLowerCase().includes(q));
  }, [segments, filterText]);

  const handleCopyTranscript = () => {
    if (!transcript) return;
    const textToCopy = segments.map((s) => `[${formatTime(s.start)}] ${s.text}`).join("\n");
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (timeInSecs: number) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (!transcript || segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-surface-border bg-surface-dark p-8 text-center text-text-secondary min-h-[340px]">
        <FileText className="h-10 w-10 text-surface-border mb-3" />
        <h4 className="text-sm font-semibold text-text-primary font-heading">Transcript Ingestion Queued</h4>
        <p className="text-xs text-text-secondary mt-1.5 max-w-xs leading-relaxed">
          Bilingual Hindi/English transcript is queued for extraction via the Whisper background pipeline.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full rounded-2xl border border-surface-border bg-surface-dark overflow-hidden shadow-sm">
      {/* Header & Controls */}
      <div className="flex items-center justify-between border-b border-surface-border p-3.5 bg-surface-dark">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand-secondary" />
          <h3 className="text-xs font-bold text-text-primary font-heading">Interactive Transcript</h3>
          <span className="rounded-md bg-brand-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-brand-primary uppercase border border-brand-primary/20">
            {transcript.language || "Bilingual Hi/En"}
          </span>
        </div>

        <button
          onClick={handleCopyTranscript}
          className="flex items-center gap-1.5 rounded-lg border border-surface-border bg-background-dark px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:text-text-primary hover:border-surface-border/80 transition-colors"
          title="Copy full transcript with timestamps"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-success" />
              <span className="text-success font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy Notes</span>
            </>
          )}
        </button>
      </div>

      {/* Filter Search Input */}
      <div className="border-b border-surface-border p-2.5 bg-background-dark/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
          <input
            type="text"
            placeholder="Search keywords in transcript..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full rounded-xl border border-surface-border bg-surface-dark py-1.5 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Synchronized Segments List */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-1.5 text-xs scroll-smooth"
      >
        {filteredSegments.map((seg, idx) => {
          const isActive = idx === activeIndex;
          return (
            <div
              key={idx}
              ref={isActive ? activeSegmentRef : null}
              onClick={() => onSeek(seg.start)}
              className={`group flex items-start gap-2.5 rounded-xl p-2.5 cursor-pointer transition-all border ${
                isActive
                  ? "bg-brand-primary/15 border-brand-primary/40 text-text-primary shadow-sm"
                  : "bg-surface-dark border-transparent hover:border-surface-border hover:bg-background-dark text-text-secondary"
              }`}
            >
              {/* Monospaced Timestamp */}
              <button
                className={`font-mono text-[11px] px-2 py-0.5 rounded-md shrink-0 font-semibold transition-colors ${
                  isActive
                    ? "bg-brand-primary text-text-primary shadow-sm shadow-brand-primary/30"
                    : "bg-background-dark border border-surface-border text-brand-secondary group-hover:border-brand-secondary/40"
                }`}
              >
                {formatTime(seg.start)}
              </button>

              {/* Transcript Text Snippet */}
              <p className={`leading-relaxed flex-1 text-xs ${isActive ? "text-text-primary font-medium" : "group-hover:text-text-primary"}`}>
                {seg.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
