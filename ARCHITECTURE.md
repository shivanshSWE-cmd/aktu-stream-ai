# System Architecture & Technical Flow — AKTU Stream AI

## 1. High-Level Architecture Flow

```mermaid
flowchart TD
    subgraph Clients["Student & Admin Clients"]
        Web["Next.js 14 App Router (React, Tailwind, TypeScript)"]
        Player["Dual Player Engine (HLS.js & YouTube IFrame)"]
        TransView["Sync Transcript & Timestamp Seek"]
        UploadClient["Direct Browser-to-S3 Multipart Uploader"]
    end

    subgraph EdgeCDN["Edge & CDN Distribution Layer"]
        CDN["Cloudflare CDN / AWS CloudFront"]
        CORS["Signed URL & Cache Invalidation Gateway"]
    end

    subgraph APILayer["FastAPI Application Services (Python 3.12+)"]
        Router["FastAPI Core Router (/api/v1)"]
        SubjService["Taxonomy Service (Curriculum & Units 1-5)"]
        SearchService["Vector Search Service (pgvector Cosine Sim)"]
        UploadService["Storage Service (Presigned S3/R2 Signer)"]
        QuotaMonitor["YouTube Quota Guard (10k Budget Logger)"]
    end

    subgraph Workers["Distributed Background Processing (ARQ / Celery)"]
        IngestWorker["Ingestion Worker (UU Playlist Poller)"]
        TranscribeWorker["Transcript Extractor (youtube-transcript-api)"]
        GatekeeperWorker["Two-Stage AI Classifier (Gemini 3.8 Flash)"]
        HLSWorker["Dedicated FFmpeg Transcoding Worker (Multi-Bitrate)"]
    end

    subgraph DataStore["Persistence & Message Layer"]
        PG["PostgreSQL 16 + pgvector (Taxonomy, Videos, Embeddings)"]
        Redis["Redis 7 (Task Queue, Cache, Rate Limits)"]
        ObjStore["Cloudflare R2 / AWS S3 (Raw MP4 & Transcoded HLS)"]
    end

    subgraph ExternalServices["External Providers & APIs"]
        YTAPI["YouTube Data API v3 (Strict UU playlistItems & videos.list)"]
        GeminiAPI["Google GenAI API (Gemini 3.8 Flash & Embeddings)"]
    end

    %% Client Interactions
    Web --> Router
    Player --> CDN
    UploadClient --> ObjStore
    Router --> SubjService & SearchService & UploadService & QuotaMonitor

    %% API to Storage & Redis
    Router --> PG
    Router --> Redis
    QuotaMonitor --> PG
    SearchService --> PG

    %% Background Queueing
    Router -->|Dispatch Tasks| Redis
    Redis --> IngestWorker & TranscribeWorker & GatekeeperWorker & HLSWorker

    %% Worker Operations
    IngestWorker -->|1 Unit Query| YTAPI
    TranscribeWorker -->|Bilingual Subtitles| YTAPI
    GatekeeperWorker -->|Structured Validation| GeminiAPI
    HLSWorker -->|Fetch Raw MP4| ObjStore
    HLSWorker -->|Upload HLS 1080p/720p/480p/360p + master.m3u8| ObjStore
    GatekeeperWorker -->|Persist Verified Video & Embeddings| PG
    ObjStore --> CDN
```

---

## 2. Ingestion Pipeline & Strict Quota Budgeting Flow

To eliminate YouTube Data API quota exhaustion (where `search.list` burns 100 quota units per call with a 10,000 units/day limit), **AKTU Stream AI operates on a strictly enforced zero-search architecture**:

```mermaid
sequenceDiagram
    autonumber
    participant Admin as System / Cron
    participant QuotaMgr as YouTubeQuotaManager
    participant DB as PostgreSQL (QuotaLog)
    participant YT as YouTube Data API v3
    participant TranscriptAPI as youtube-transcript-api
    participant Gatekeeper as TwoStageClassifier (Gemini 3.8 Flash)

    Admin->>QuotaMgr: Trigger Channel Sync (channel_id: UC...)
    QuotaMgr->>QuotaMgr: Derive Uploads Playlist (UC... -> UU...)
    QuotaMgr->>DB: Check daily quota consumed (< 10,000 units)
    alt Quota Exceeded (used >= 10,000)
        QuotaMgr-->>Admin: Raise QuotaExceededError (429)
    else Quota Available
        QuotaMgr->>DB: Log quota intent (1 unit: playlistItems.list)
        QuotaMgr->>YT: playlistItems.list(playlistId="UU...", part="snippet,contentDetails")
        YT-->>QuotaMgr: List of 10-50 video items (Cost: 1 unit)
        
        QuotaMgr->>DB: Log quota intent (1 unit: videos.list batch)
        QuotaMgr->>YT: videos.list(id="id1,id2,...", part="snippet,contentDetails,statistics")
        YT-->>QuotaMgr: Complete metadata, duration, tags (Cost: 1 unit per 50 batch)
        
        loop For Each Video In Ingestion Batch
            QuotaMgr->>TranscriptAPI: Fetch Hindi/English Captions (hi, en, auto)
            TranscriptAPI-->>QuotaMgr: Segments + Cleaned 4,000 char snippet
            QuotaMgr->>Gatekeeper: Classify Video (Title, Snippet, Transcript)
            Gatekeeper-->>QuotaMgr: ClassificationOutput (is_aktu, subject_code, unit, confidence)
            alt Gatekeeper Approved (confidence >= 0.70 & is_aktu)
                QuotaMgr->>DB: INSERT INTO videos (status="APPROVED")
                QuotaMgr->>DB: INSERT INTO video_transcripts (embedding vector)
            else Gatekeeper Rejected (confidence < 0.70)
                QuotaMgr->>DB: INSERT INTO video_classifications (status="REJECTED", reason)
            end
        end
    end
```

### Quota Math Comparison
- **Standard Search Approach**: 100 calls = $100 \times 100 = 10,000\text{ units}$ (Quota exhausted in 100 queries).
- **AKTU Stream AI Zero-Search Engine**:
  - `playlistItems.list`: **1 unit** per 50 videos.
  - `videos.list` (Batch of 50): **1 unit**.
  - Total cost for 50 videos: **2 quota units** ($99.98\%$ reduction).
  - Daily capacity under 10k quota: **up to 250,000 indexed videos per day**.

---

## 3. Two-Stage Content Gatekeeping & Verification Pipeline

Every lecture—whether scraped from YouTube or uploaded natively by a student—must clear the Two-Stage Academic Gatekeeper:

```mermaid
flowchart TD
    VideoInput["Candidate Video (Title, Channel, Description, Tags, Transcript)"] --> Stage1{"Stage 1: Fast Heuristic Screener"}

    Stage1 -->|"Matches Spam / Gaming / Vlogs / Non-Academic"| RejectS1["REJECTED: Non-academic indicator detected (Confidence: 0.15)"]
    Stage1 -->|"Contains AKTU / Engineering / AI Keywords"| Stage2["Stage 2: Gemini 3.8 Flash Academic Classifier"]

    subgraph Stage2Eval["Stage 2: Deep LLM Syllabus Evaluation"]
        PromptPrep["Inject Official AKTU Taxonomy Reference + 4,000 char Transcript"]
        LLMCall["Gemini 3.8 Flash (Structured JSON Schema)"]
        PromptPrep --> LLMCall
    end

    Stage2 --> Stage2Eval
    LLMCall --> GatekeeperRules{"Gatekeeper Rules:\nis_aktu_or_ai_study == True\nAND\nconfidence >= 0.70"}

    GatekeeperRules -->|"Fails criteria or confidence < 0.70"| RejectS2["REJECTED: Quarantined to Rejection Audit Feed"]
    GatekeeperRules -->|"Passes both criteria"| CheckTaxonomy{"Is subject_code in OFFICIAL_SUBJECTS?"}

    CheckTaxonomy -->|"Yes (e.g. BCS501, BAS101)"| AssignOfficial["Assign to Official Code & Unit (1-5)"]
    CheckTaxonomy -->|"No (General Foundational AI)"| AssignAI["Normalize to 'AI_GENERAL' Track"]

    AssignOfficial --> Embed["Generate 768d pgvector Embedding & Publish to Feed"]
    AssignAI --> Embed
```

### Structured Output Contract (`ClassificationOutput`)
```json
{
  "is_aktu_or_ai_study": true,
  "subject_code": "BCS501",
  "unit_number": 2,
  "confidence": 0.96,
  "summary": "Covers relational algebra, tuple relational calculus, and SQL join queries for AKTU Unit 2 DBMS.",
  "rejection_reason": null,
  "topics_covered": [
    "Relational Algebra",
    "Tuple Relational Calculus",
    "SQL Joins",
    "Integrity Constraints"
  ]
}
```

---

## 4. Storage & FFmpeg Multi-Bitrate HLS Transcoding Architecture

Web server memory must never be exhausted by multi-gigabyte video uploads. All native student video files stream directly to S3/Cloudflare R2 via presigned URLs, and transcoding runs asynchronously in a dedicated worker container:

```mermaid
sequenceDiagram
    autonumber
    participant Student as Student Browser
    participant API as FastAPI Web Server
    participant S3 as Object Storage (AWS S3 / Cloudflare R2)
    participant Worker as Dedicated FFmpeg Worker Container
    participant CDN as Global CDN

    Student->>API: POST /api/v1/upload/presigned-url (filename, size, subject, unit)
    API->>API: Generate unique video_id & S3 key (raw/{video_id}/{filename})
    API->>S3: Request Presigned PUT URL (Content-Type: video/mp4, 3600s TTL)
    S3-->>API: Signed PUT URL + Headers
    API-->>Student: {video_id, raw_s3_key, upload_url}

    Student->>S3: Direct PUT Multipart Stream (Raw MP4)
    Note over Student,S3: Video binary flows directly to S3. 0 bytes touch web container.
    
    Student->>API: POST /api/v1/upload/complete {video_id, raw_s3_key}
    API->>Worker: Dispatch Transcoding Task (video_id)
    API-->>Student: 202 Accepted (Status: PROCESSING)

    Worker->>S3: Download Raw MP4 to isolated scratch space
    Worker->>Worker: Execute Multi-Bitrate FFmpeg Pipeline
    Note over Worker: Transcodes into 1080p, 720p, 480p, 360p .ts segments & manifests
    Worker->>Worker: Generate Unified Master Playlist (master.m3u8)
    Worker->>S3: Upload manifests & .ts segments to hls/{video_id}/
    Worker->>Worker: Cleanup local scratch space
    Worker->>API: Update Video (s3_hls_master_url, status="READY")
    
    Student->>CDN: Request master.m3u8 via VideoPlayer
    CDN-->>Student: Adaptive Bitrate HLS Stream
```

### Multi-Bitrate Output Specifications
| Stream Profile | Resolution | Video Bitrate | Audio Bitrate | Target Bandwidth | Playlist Manifest |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1080p High** | $1920 \times 1080$ | 5,000 kbps | 192 kbps | 5,192,000 bps | `stream_0.m3u8` |
| **720p Standard**| $1280 \times 720$ | 2,800 kbps | 128 kbps | 2,928,000 bps | `stream_1.m3u8` |
| **480p Balanced**| $854 \times 480$ | 1,400 kbps | 128 kbps | 1,528,000 bps | `stream_2.m3u8` |
| **360p Mobile**  | $640 \times 360$ | 800 kbps | 96 kbps | 896,000 bps | `stream_3.m3u8` |
| **Master Index** | Adaptive Multi | VBR | AAC-LC | Dynamic | `master.m3u8` |

---

## 5. Database Schema & Relational Constraint Architecture

The PostgreSQL 16 schema enforces strict referential integrity down to unit intervals ($1 \le \text{unit\_number} \le 5$):

```mermaid
erDiagram
    BRANCHES ||--o{ SUBJECTS : "contains"
    BRANCHES ||--o{ CHANNEL_WHITELISTS : "monitors"
    SUBJECTS ||--|{ UNITS : "strictly partitioned into 1..5"
    SUBJECTS ||--o{ VIDEO_CLASSIFICATIONS : "categorizes"
    VIDEOS ||--|| VIDEO_CLASSIFICATIONS : "evaluated by"
    VIDEOS ||--o| VIDEO_TRANSCRIPTS : "contains"
    VIDEOS ||--o{ USER_PROGRESS : "tracked by"

    BRANCHES {
        string code PK "CSE, IT, AIML, ECE, EE, ME, CE, ALL"
        string name "Full Branch Name"
        text description
        boolean is_active
        timestamp created_at
    }

    SUBJECTS {
        string code PK "BCS301, BCS501, BAS101, etc."
        string name "Subject Title"
        string branch_code FK "References BRANCHES(code)"
        integer semester "CHECK (semester BETWEEN 1 AND 8)"
        text syllabus_markdown
        boolean is_active
        timestamp created_at
    }

    UNITS {
        string id PK "UUID"
        string subject_code FK "References SUBJECTS(code)"
        integer unit_number "CHECK (unit_number BETWEEN 1 AND 5)"
        string title "Unit Title"
        jsonb topics "Array of syllabus topic strings"
        text summary
        timestamp created_at
    }

    VIDEOS {
        string id PK "UUID"
        string title
        text description
        string source_type "YOUTUBE or NATIVE"
        text source_url
        string youtube_video_id "Indexed"
        string s3_raw_key
        string s3_hls_master_url
        integer duration_seconds
        text thumbnail_url
        integer view_count
        timestamp created_at
        timestamp updated_at
    }

    VIDEO_CLASSIFICATIONS {
        string id PK "UUID"
        string video_id FK "UNIQUE references VIDEOS(id)"
        string subject_code FK "References SUBJECTS(code)"
        integer unit_number "CHECK (unit_number BETWEEN 1 AND 5)"
        boolean is_aktu_or_ai_study
        float confidence "Score 0.00 to 1.00"
        string status "APPROVED, REJECTED, PENDING"
        text summary
        text rejection_reason
        jsonb topics_covered
        timestamp created_at
    }

    VIDEO_TRANSCRIPTS {
        string id PK "UUID"
        string video_id FK "UNIQUE references VIDEOS(id)"
        string language "hi, en, hi-Latn"
        text full_text
        jsonb segments "Array of start, duration, text"
        vector embedding "Vector 768 pgvector"
        timestamp created_at
    }

    USER_PROGRESS {
        string id PK "UUID"
        string session_id "Indexed"
        string video_id FK "References VIDEOS(id)"
        float last_position_seconds
        boolean is_completed
        timestamp updated_at
    }

    CHANNEL_WHITELISTS {
        string id PK "UUID"
        string channel_id "UC... unique"
        string uploads_playlist_id "UU... derived"
        string channel_title
        string branch_code FK "References BRANCHES(code)"
        boolean is_active
        timestamp last_synced_at
        timestamp created_at
    }

    QUOTA_LOGS {
        string id PK "UUID"
        string api_type "YOUTUBE_DATA_V3"
        string endpoint "playlistItems.list, videos.list"
        integer units_used
        jsonb details
        timestamp timestamp "Indexed"
    }
```

---

## 6. Frontend Architecture & Dual Playback Engine

Built with Next.js 14 App Router, TypeScript strict mode, and Tailwind CSS. The player provides an abstraction layer switching seamlessly between YouTube embeds and native multi-bitrate HLS streaming:

```mermaid
flowchart LR
    subgraph UIModules["Next.js 14 App Router Modules"]
        PageNav["/subjects Navigator (Branch & Sem)"]
        UnitHub["/subjects/[code] (5 Unit Tabs)"]
        Studio["/watch/[id] Player Studio"]
        UploadPage["/upload Direct S3 Client"]
        AdminHub["/admin/ingestion Quota Monitor"]
    end

    subgraph PlayerEngine["Enterprise Video Player Engine"]
        Detect{"Detect source_type"}
        YTIframe["Responsive YouTube IFrame with start parameter"]
        HLSPlayer["Hls.js / Native Safari HLS with Audio Sync"]
        TimeHook["onTimeUpdate Hook (10s debounce)"]
    end

    subgraph SyncInteractive["Synchronized Study Experience"]
        ScrollTranscript["Auto-Scroll Synchronized Transcript"]
        ClickSeek["Click-to-Seek Interactive Jump Points"]
        SaveProgress["POST /api/v1/videos/{id}/progress"]
    end

    Studio --> Detect
    Detect -->|source_type == 'YOUTUBE'| YTIframe
    Detect -->|source_type == 'NATIVE'| HLSPlayer
    YTIframe & HLSPlayer --> TimeHook
    TimeHook --> ScrollTranscript
    ClickSeek -->|currentTime = ts| YTIframe & HLSPlayer
    TimeHook --> SaveProgress
```

---

## 7. Observability, Security, & Non-Functional Resilience

1. **Sub-100ms API Response Latency**:
   - Static AKTU syllabus trees and unit definitions are indexed with composite indices `(subject_code, unit_number)` and cached in memory.
2. **Sub-300ms Semantic Search**:
   - Fast semantic retrieval uses `pgvector` HNSW / IVFFlat indexing across 768-dimensional embeddings generated from transcript segments.
3. **Transient Failure Handling**:
   - YouTube Data API and Google GenAI API clients implement exponential backoff with jitter on HTTP `429` / `503` responses.
4. **Permanent Zero-Search Guard**:
   - The method `verify_and_log_quota()` intercepts any call containing `"search"` and immediately raises a `PermissionError`, ensuring unauthorized search queries are halted before contacting Google Cloud endpoints.
