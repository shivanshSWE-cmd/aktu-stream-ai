"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  ExternalLink,
  Flame,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Tv,
} from "lucide-react";
import { api } from "@/lib/api";
import { ChannelWhitelist, QuotaStatus } from "@/lib/types";

export default function IngestionAdminPage() {
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [channels, setChannels] = useState<ChannelWhitelist[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New channel form state
  const [newChannelId, setNewChannelId] = useState("");
  const [newChannelTitle, setNewChannelTitle] = useState("");
  const [newBranchCode, setNewBranchCode] = useState("CSE");
  const [formError, setFormError] = useState("");

  // Trigger state
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<any | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [qData, cData, aData] = await Promise.allSettled([
        api.getQuotaStatus(),
        api.getWhitelistedChannels(),
        api.getRejectionAuditLog(),
      ]);

      if (qData.status === "fulfilled") setQuota(qData.value);
      if (cData.status === "fulfilled") setChannels(cData.value);
      if (aData.status === "fulfilled") setAuditLog(aData.value);
    } catch (err) {
      console.error("Failed to load ingestion admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelId.trim().startsWith("UC")) {
      setFormError("Channel ID must start with 'UC' (e.g. UCwFA3V77gqLreXm6_Pky4iQ).");
      return;
    }
    if (!newChannelTitle.trim()) {
      setFormError("Please enter a channel title.");
      return;
    }

    try {
      setFormError("");
      await api.addWhitelistedChannel(
        newChannelId.trim(),
        newChannelTitle.trim(),
        newBranchCode
      );
      setNewChannelId("");
      setNewChannelTitle("");
      await loadData();
    } catch (err: any) {
      setFormError(err.message || "Failed to add channel.");
    }
  };

  const handleTriggerIngest = async (channelId?: string) => {
    try {
      setIsTriggering(true);
      setTriggerResult(null);
      const res = await api.triggerIngest(channelId, 10);
      setTriggerResult(res);
      await loadData();
    } catch (err: any) {
      alert("Ingest error: " + err.message);
    } finally {
      setIsTriggering(false);
    }
  };

  const percentUsed = quota ? Math.min(100, Math.round((quota.units_used_today / quota.daily_quota_limit) * 100)) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 mb-2">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
            <span>Zero `search.list` Quota Policy • Strict UU Derivation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Ingestion Hub & Quota Budget Manager
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Monitor API consumption, manage whitelisted YouTube lecture channels, and audit Two-Stage Gatekeeper rejections.
          </p>
        </div>

        <button
          onClick={() => handleTriggerIngest()}
          disabled={isTriggering}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-600/30 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${isTriggering ? "animate-spin" : ""}`} />
          {isTriggering ? "Ingesting & Classifying..." : "Trigger Ingestion Now"}
        </button>
      </div>

      {/* Quota Gauge & Budget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Daily Units Meter */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Daily Quota Budget
            </span>
            <Flame className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {quota?.units_used_today.toLocaleString() || 0}
            </span>
            <span className="text-xs text-gray-400 font-medium">
              / {quota?.daily_quota_limit.toLocaleString() || 10000} units
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                percentUsed > 85 ? "bg-red-500" : percentUsed > 50 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.max(2, percentUsed)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span>{percentUsed}% Consumed</span>
            <span className="text-emerald-400 font-semibold">
              {quota?.units_remaining_today.toLocaleString() || 10000} remaining
            </span>
          </div>
        </div>

        {/* Card 2: Quota Optimization Guarantee */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Search API Elimination
            </span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">
            99% Quota Saved
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            `search.list` (100 units) is permanently disabled. Uploads playlist query `playlistItems.list` consumes exactly 1 unit per batch!
          </p>
        </div>

        {/* Card 3: Endpoint Breakdown */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Endpoint Breakdown (Today)
            </span>
            <Database className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="space-y-1.5 pt-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">playlistItems.list</span>
              <span className="font-mono text-white">
                {quota?.endpoints_breakdown?.["playlistItems.list"] || 0} units
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">videos.list</span>
              <span className="font-mono text-white">
                {quota?.endpoints_breakdown?.["videos.list"] || 0} units
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-800 pt-1 text-emerald-400 font-semibold">
              <span>search.list (Blocked)</span>
              <span>0 units</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trigger Results Toast (if triggered) */}
      {triggerResult && (
        <div className="rounded-2xl border border-indigo-500/40 bg-indigo-950/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Ingestion Run Completed for &apos;{triggerResult.channel_title}&apos;
            </h3>
            <span className="text-xs text-indigo-300 font-mono">
              Quota Spent: {triggerResult.quota_units_used} units
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded bg-gray-900/80 p-2 border border-gray-800">
              <span className="text-gray-400 block">Fetched</span>
              <span className="font-bold text-white text-sm">{triggerResult.videos_fetched}</span>
            </div>
            <div className="rounded bg-emerald-950/40 p-2 border border-emerald-800/40">
              <span className="text-emerald-400 block">Gatekeeper Approved</span>
              <span className="font-bold text-emerald-300 text-sm">{triggerResult.approved_count}</span>
            </div>
            <div className="rounded bg-red-950/40 p-2 border border-red-800/40">
              <span className="text-red-400 block">Rejected / Excluded</span>
              <span className="font-bold text-red-300 text-sm">{triggerResult.rejected_count}</span>
            </div>
          </div>
        </div>
      )}

      {/* Whitelisted Channels Management */}
      <div className="rounded-3xl border border-gray-800 bg-gray-900/60 p-6 space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Tv className="h-5 w-5 text-indigo-400" />
          Whitelisted YouTube Academic Channels
        </h2>

        {/* Add Channel Form */}
        <form onSubmit={handleAddChannel} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <input
              type="text"
              placeholder="YouTube Channel ID (e.g. UCwFA3V77gqLreXm6_Pky4iQ)"
              value={newChannelId}
              onChange={(e) => setNewChannelId(e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-gray-950 p-2.5 text-xs text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Channel Title (e.g. GateWay Classes)"
              value={newChannelTitle}
              onChange={(e) => setNewChannelTitle(e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-gray-950 p-2.5 text-xs text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 p-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Whitelist
          </button>
        </form>

        {formError && <p className="text-xs text-red-400">{formError}</p>}

        {/* Channels Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="border-b border-gray-800 text-[11px] uppercase tracking-wider text-gray-400 bg-gray-950/60">
              <tr>
                <th className="p-3">Channel Title</th>
                <th className="p-3">Channel ID (UC...)</th>
                <th className="p-3">Uploads Playlist (UU...)</th>
                <th className="p-3">Branch</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {channels.map((c) => (
                <tr key={c.id} className="hover:bg-gray-800/40">
                  <td className="p-3 font-semibold text-white">{c.channel_title}</td>
                  <td className="p-3 font-mono text-gray-400">{c.channel_id}</td>
                  <td className="p-3 font-mono text-cyan-400">{c.uploads_playlist_id}</td>
                  <td className="p-3">
                    <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-bold text-indigo-300">
                      {c.branch_code || "ALL"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleTriggerIngest(c.channel_id)}
                      className="rounded bg-gray-800 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors"
                    >
                      Sync Now
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two-Stage Gatekeeper Rejection Audit Feed */}
      <div className="rounded-3xl border border-gray-800 bg-gray-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-400" />
            Two-Stage Gatekeeper Rejection Audit Log
          </h2>
          <span className="text-xs text-gray-400">
            {auditLog.length} excluded non-academic items
          </span>
        </div>
        <p className="text-xs text-gray-400">
          Rule 2 Compliance: Videos failing `is_aktu_or_ai_study` verification or returning a confidence score under 0.70 are automatically quarantined here.
        </p>

        <div className="space-y-2">
          {auditLog.length > 0 ? (
            auditLog.map((entry, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-950/10 p-3.5 text-xs"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-white">{entry.title}</p>
                  <p className="text-red-300 text-[11px]">
                    <span className="font-bold">Rejection Reason:</span> {entry.rejection_reason}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="rounded bg-red-500/20 px-2 py-1 font-bold text-red-300 border border-red-500/30">
                    Confidence: {(entry.confidence * 100).toFixed(0)}% (&lt; 70%)
                  </span>
                  <span className="text-gray-500 text-[10px]">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-gray-800 p-8 text-center text-xs text-gray-500">
              No rejected videos recorded. Gatekeeper is standing by.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
