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
  Tv,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { ChannelWhitelist, QuotaStatus } from "@/types";

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
        apiClient.getQuotaStatus(),
        apiClient.getWhitelistedChannels(),
        apiClient.getRejectionAuditLog(),
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
      await apiClient.addWhitelistedChannel(
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
      const res = await apiClient.triggerIngest(channelId, 10);
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
          <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-primary/20 bg-brand-primary/10 px-3 py-1 text-xs font-mono font-semibold text-brand-primary mb-2">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-secondary" />
            <span>Zero `search.list` Quota Policy • Strict UU Derivation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight font-heading">
            Ingestion Hub & Quota Budget Manager
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Monitor API consumption, manage whitelisted YouTube lecture channels, and audit Two-Stage Gatekeeper rejections.
          </p>
        </div>

        <button
          onClick={() => handleTriggerIngest()}
          disabled={isTriggering}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-semibold text-text-primary hover:bg-brand-primary/90 disabled:opacity-50 transition-all shadow-sm shrink-0 font-mono"
        >
          <RefreshCw className={`h-4 w-4 ${isTriggering ? "animate-spin" : ""}`} />
          {isTriggering ? "Ingesting & Classifying..." : "Trigger Ingestion Now"}
        </button>
      </div>

      {/* Quota Gauge & Budget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Daily Units Meter */}
        <div className="rounded-2xl border border-surface-border bg-surface-dark p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider">
              Daily Quota Budget
            </span>
            <Flame className="h-4 w-4 text-brand-secondary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-text-primary">
              {quota?.units_used_today.toLocaleString() || 0}
            </span>
            <span className="text-xs font-mono text-text-secondary">
              / {quota?.daily_quota_limit.toLocaleString() || 10000} units
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full bg-surface-border rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                percentUsed > 85 ? "bg-danger" : percentUsed > 50 ? "bg-brand-secondary" : "bg-success"
              }`}
              style={{ width: `${Math.max(2, percentUsed)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-text-secondary">
            <span>{percentUsed}% Consumed</span>
            <span className="text-success font-semibold">
              {quota?.units_remaining_today.toLocaleString() || 10000} remaining
            </span>
          </div>
        </div>

        {/* Card 2: Quota Optimization Guarantee */}
        <div className="rounded-2xl border border-surface-border bg-surface-dark p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider">
              Search API Elimination
            </span>
            <ShieldCheck className="h-4 w-4 text-success" />
          </div>
          <div className="text-2xl font-bold font-mono text-success">
            99% Quota Saved
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            `search.list` (100 units) is permanently disabled. Uploads playlist query `playlistItems.list` consumes exactly 1 unit per call!
          </p>
        </div>

        {/* Card 3: Endpoint Breakdown */}
        <div className="rounded-2xl border border-surface-border bg-surface-dark p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider">
              Endpoint Breakdown (Today)
            </span>
            <Database className="h-4 w-4 text-brand-secondary" />
          </div>
          <div className="space-y-1.5 pt-1 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-text-secondary">playlistItems.list</span>
              <span className="text-text-primary">
                {quota?.endpoints_breakdown?.["playlistItems.list"] || 0} units
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">videos.list</span>
              <span className="text-text-primary">
                {quota?.endpoints_breakdown?.["videos.list"] || 0} units
              </span>
            </div>
            <div className="flex justify-between border-t border-surface-border pt-1 text-success font-semibold">
              <span>search.list (Blocked)</span>
              <span>0 units</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trigger Results Toast (if triggered) */}
      {triggerResult && (
        <div className="rounded-2xl border border-brand-primary/40 bg-surface-dark p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 font-heading">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Ingestion Run Completed for &apos;{triggerResult.channel_title}&apos;
            </h3>
            <span className="text-xs text-brand-primary font-mono font-semibold">
              Quota Spent: {triggerResult.quota_units_used} units
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="rounded-xl bg-background-dark p-2 border border-surface-border">
              <span className="text-text-secondary block">Fetched</span>
              <span className="font-bold text-text-primary text-sm">{triggerResult.videos_fetched}</span>
            </div>
            <div className="rounded-xl bg-success/10 p-2 border border-success/20">
              <span className="text-success block">Gatekeeper Approved</span>
              <span className="font-bold text-success text-sm">{triggerResult.approved_count}</span>
            </div>
            <div className="rounded-xl bg-danger/10 p-2 border border-danger/20">
              <span className="text-danger block">Rejected / Quarantined</span>
              <span className="font-bold text-danger text-sm">{triggerResult.rejected_count}</span>
            </div>
          </div>
        </div>
      )}

      {/* Whitelisted Channels Management */}
      <div className="rounded-3xl border border-surface-border bg-surface-dark p-6 space-y-6 shadow-sm">
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 font-heading">
          <Tv className="h-5 w-5 text-brand-primary" />
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
              className="w-full rounded-xl border border-surface-border bg-background-dark p-2.5 text-xs font-mono text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Channel Title (e.g. GateWay Classes)"
              value={newChannelTitle}
              onChange={(e) => setNewChannelTitle(e.target.value)}
              className="w-full rounded-xl border border-surface-border bg-background-dark p-2.5 text-xs text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-primary p-2.5 text-xs font-semibold text-text-primary hover:bg-brand-primary/90 transition-all font-mono"
          >
            <Plus className="h-4 w-4" />
            Add Whitelist
          </button>
        </form>

        {formError && <p className="text-xs text-danger font-mono">{formError}</p>}

        {/* Channels Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text-secondary">
            <thead className="border-b border-surface-border text-[11px] font-mono uppercase tracking-wider text-text-secondary bg-background-dark/60">
              <tr>
                <th className="p-3">Channel Title</th>
                <th className="p-3">Channel ID (UC...)</th>
                <th className="p-3">Uploads Playlist (UU...)</th>
                <th className="p-3">Branch</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {channels.map((c) => (
                <tr key={c.id} className="hover:bg-background-dark/40 transition-colors">
                  <td className="p-3 font-semibold text-text-primary">{c.channel_title}</td>
                  <td className="p-3 font-mono text-text-secondary">{c.channel_id}</td>
                  <td className="p-3 font-mono text-brand-secondary">{c.uploads_playlist_id}</td>
                  <td className="p-3">
                    <span className="rounded-md bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 font-mono font-bold text-brand-primary">
                      {c.branch_code || "ALL"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleTriggerIngest(c.channel_id)}
                      className="rounded-lg bg-surface-dark border border-surface-border px-2.5 py-1 text-[11px] font-mono font-semibold text-brand-primary hover:bg-brand-primary hover:text-text-primary transition-colors"
                    >
                      Sync
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two-Stage Gatekeeper Rejection Audit Feed */}
      <div className="rounded-3xl border border-surface-border bg-surface-dark p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 font-heading">
            <ShieldAlert className="h-5 w-5 text-danger" />
            Two-Stage Gatekeeper Rejection Audit Log
          </h2>
          <span className="text-xs font-mono text-text-secondary">
            {auditLog.length} quarantined items
          </span>
        </div>
        <p className="text-xs text-text-secondary">
          Rule 2 Compliance: Videos failing `is_aktu_or_ai_study` verification or returning a confidence score under 0.70 are automatically quarantined here.
        </p>

        <div className="space-y-2">
          {auditLog.length > 0 ? (
            auditLog.map((entry, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-background-dark p-3.5 text-xs"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-text-primary">{entry.title}</p>
                  <p className="text-danger text-[11px]">
                    <span className="font-bold">Rejection Reason:</span> {entry.rejection_reason}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 font-mono">
                  <span className="rounded-md bg-danger/15 px-2 py-0.5 font-bold text-danger border border-danger/30 text-[11px]">
                    Confidence: {(entry.confidence * 100).toFixed(0)}% (&lt; 70%)
                  </span>
                  <span className="text-text-secondary text-[10px]">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-surface-border p-8 text-center text-xs text-text-secondary font-mono">
              No rejected videos recorded. Gatekeeper is standing by.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
