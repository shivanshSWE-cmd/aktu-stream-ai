export * from "./syllabus";

export interface VideoClassification {
  id: string;
  video_id: string;
  subject_code?: string;
  unit_number?: number;
  is_aktu_or_ai_study: boolean;
  confidence: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  summary?: string;
  rejection_reason?: string;
  topics_covered: string[];
  created_at: string;
}

export interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

export interface Transcript {
  id: string;
  video_id: string;
  language: string;
  full_text: string;
  segments: TranscriptSegment[];
  created_at: string;
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  source_type: "YOUTUBE" | "NATIVE";
  source_url?: string;
  youtube_video_id?: string;
  s3_hls_master_url?: string;
  duration_seconds: number;
  thumbnail_url?: string;
  view_count: number;
  created_at: string;
  updated_at: string;
  classification?: VideoClassification;
  transcript?: Transcript;
}

export interface UserProgress {
  id: string;
  session_id: string;
  video_id: string;
  last_position_seconds: number;
  is_completed: boolean;
  updated_at: string;
}

export interface ChannelWhitelist {
  id: string;
  channel_id: string;
  uploads_playlist_id: string;
  channel_title: string;
  branch_code?: string;
  is_active: boolean;
  last_synced_at?: string;
  created_at: string;
}

export interface QuotaStatus {
  daily_quota_limit: number;
  units_used_today: number;
  units_remaining_today: number;
  is_budget_exceeded: boolean;
  endpoints_breakdown: Record<string, number>;
}

export interface SearchResultItem {
  video_id: string;
  title: string;
  thumbnail_url?: string;
  subject_code?: string;
  unit_number?: number;
  snippet: string;
  timestamp_seconds?: number;
  similarity_score: number;
}
