import {
  Branch,
  ChannelWhitelist,
  QuotaStatus,
  SearchResultItem,
  Subject,
  Unit,
  UserProgress,
  Video,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const errorText = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(errorText);
      } catch {
        parsed = { detail: errorText };
      }
      throw new Error(parsed.detail || `HTTP Error ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    console.error(`API Error on ${path}:`, err.message);
    throw err;
  }
}

export const apiClient = {
  // Branches & Subjects
  getBranches: () => fetchJson<Branch[]>("/subjects/branches"),

  getSubjects: (branchCode?: string, semester?: number) => {
    const params = new URLSearchParams();
    if (branchCode) params.set("branch_code", branchCode);
    if (semester) params.set("semester", semester.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchJson<Subject[]>(`/subjects/${query}`);
  },

  getSubjectDetail: (code: string) => fetchJson<Subject>(`/subjects/${code}`),

  getUnitVideos: (code: string, unitNumber: number) =>
    fetchJson<Video[]>(`/subjects/${code}/units/${unitNumber}/videos`),

  // Videos & Progress
  getVideoDetail: (videoId: string) => fetchJson<Video>(`/videos/${videoId}`),

  recordView: (videoId: string) =>
    fetchJson<{ status: string; view_count: number }>(`/videos/${videoId}/view`, {
      method: "POST",
    }),

  saveProgress: (
    videoId: string,
    sessionId: string,
    positionSeconds: number,
    isCompleted: boolean = false
  ) =>
    fetchJson<UserProgress>(`/videos/${videoId}/progress`, {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        position_seconds: positionSeconds,
        is_completed: isCompleted,
      }),
    }),

  getUserProgress: (sessionId: string) =>
    fetchJson<UserProgress[]>(`/videos/user/${sessionId}/progress`),

  // Ingestion & Quota
  getQuotaStatus: () => fetchJson<QuotaStatus>("/ingestion/quota"),

  getWhitelistedChannels: () => fetchJson<ChannelWhitelist[]>("/ingestion/whitelist"),

  addWhitelistedChannel: (channelId: string, channelTitle: string, branchCode?: string) =>
    fetchJson<ChannelWhitelist>("/ingestion/whitelist", {
      method: "POST",
      body: JSON.stringify({
        channel_id: channelId,
        channel_title: channelTitle,
        branch_code: branchCode,
      }),
    }),

  triggerIngest: (channelId?: string, maxVideos: number = 10) =>
    fetchJson<any>("/ingestion/trigger", {
      method: "POST",
      body: JSON.stringify({
        channel_id: channelId,
        max_videos: maxVideos,
      }),
    }),

  getRejectionAuditLog: () => fetchJson<any[]>("/ingestion/audit-log"),

  // Submissions & Direct S3 Presigned Upload
  getPresignedUploadUrl: (data: {
    filename: string;
    file_size_bytes: number;
    title: string;
    subject_code?: string;
    unit_number?: number;
  }) =>
    fetchJson<{
      video_id: string;
      raw_s3_key: string;
      upload_url: string;
      expires_in_seconds: number;
      headers: Record<string, string>;
    }>("/submissions/presigned-url", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  notifyUploadComplete: (videoId: string, rawKey: string) =>
    fetchJson<any>("/submissions/complete", {
      method: "POST",
      body: JSON.stringify({ video_id: videoId, raw_s3_key: rawKey }),
    }),

  getTranscodeStatus: (videoId: string) =>
    fetchJson<{
      video_id: string;
      status: string;
      progress_percentage: number;
      hls_master_url?: string;
    }>(`/submissions/status/${videoId}`),

  // Semantic Search
  semanticSearch: (query: string, subjectCode?: string, unitNumber?: number) =>
    fetchJson<{
      query: string;
      total_results: number;
      results: SearchResultItem[];
    }>("/search/", {
      method: "POST",
      body: JSON.stringify({
        query,
        subject_code: subjectCode,
        unit_number: unitNumber,
        limit: 15,
      }),
    }),

  getStats: () => fetchJson<any>("/stats/"),
};
