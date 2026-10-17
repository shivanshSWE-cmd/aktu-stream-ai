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

  // If transcript has segments array, use it; otherwise create synthetic segments from full_text if possible
  const segments: TranscriptSegment[] = useMemo(() => {
    if (transcript?.segments && transcript.segments.length > 0) {
      return transcript.segments;
    }
    if (transcript?.full_text) {
      // Split into 30s chunks
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

  // Find the currently active segment based on player currentTime
  const activeIndex = useMemo(() => {
    return segments.findIndex(
      (seg) => currentTime >= seg.start && currentTime < seg.start + (seg.duration || 10)
    );
  }, [segments, currentTime]);

  // Auto-scroll to active segment
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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-800 bg-gray-900/40 p-8 text-center text-gray-500 min-h-[300px]">
        <FileText className="h-10 w-10 text-gray-600 mb-3" />
        <h4 className="text-sm font-semibold text-gray-300">Transcript Ingestion Pending</h4>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">
          Bilingual Hindi/English transcript is queued for extraction via the background pipeline.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[520px] rounded-2xl border border-gray-800 bg-gray-900/60 overflow-hidden shadow-xl">
      {/* Header & Controls */}
      <div className="flex items-center justify-between border-b border-gray-800 p-3 bg-gray-900/90">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-gray-200">Interactive Transcript</h3>
          <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300 uppercase border border-indigo-500/30">
            {transcript.language || "Bilingual Hi/En"}
          </span>
        </div>

        <button
          onClick={handleCopyTranscript}
          className="flex items-center gap-1 rounded-lg border border-gray-800 bg-gray-800/60 px-2.5 py-1 text-[11px] font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          title="Copy full transcript with timestamps"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
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
      <div className="border-b border-gray-800/80 p-2.5 bg-gray-950/40">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search within this transcript..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full rounded-lg border border-gray-800 bg-gray-900 py-1 pl-8 pr-3 text-xs text-gray-200 placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Synchronized Segments List */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 text-xs scroll-smooth"
      >
        {filteredSegments.map((seg, idx) => {
          const isActive = idx === activeIndex;
          return (
            <div
              key={idx}
              ref={isActive ? activeSegmentRef : null}
              onClick={() => onSeek(seg.start)}
              className={`group flex items-start gap-2.5 rounded-xl p-2.5 cursor-pointer transition-all ${
                isActive
                  ? "bg-indigo-600/20 border border-indigo-500/40 text-indigo-100 shadow-md shadow-indigo-600/10"
                  : "hover:bg-gray-800/50 text-gray-300"
              }`}
            >
              <button
                className={`font-mono text-[11px] px-1.5 py-0.5 rounded shrink-0 font-semibold transition-colors ${
                  isActive
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-800 text-gray-400 group-hover:bg-gray-700 group-hover:text-gray-200"
                }`}
              >
                {formatTime(seg.start)}
              </button>
              <p className="leading-relaxed flex-1">{seg.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
