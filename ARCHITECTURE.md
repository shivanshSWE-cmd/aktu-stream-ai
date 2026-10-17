# System Architecture & Flow — AKTU Stream AI

## 1. Executive Architecture Overview

AKTU Stream AI is an enterprise-grade, quota-conscious educational streaming and search platform dedicated to Dr. A.P.J. Abdul Kalam Technical University (AKTU) engineering students and AI/ML learners.

The platform enforces five non-negotiable architectural invariant rules:
1. **Strict YouTube Quota Budgeting (Zero `search.list`)**: `search.list` calls cost 100 quota units each and exhaust the 10,000 unit daily limit in 100 queries. Instead, the platform derives upload playlists (`UU...` from `UC...`) and polls `playlistItems.list` (1 unit/call) and batched `videos.list` (1 unit per 50 videos).
2. **Two-Stage AI Content Gatekeeper**: All prospective videos pass through Stage 1 heuristic pre-filtering and Stage 2 Gemini 3.8 Flash structured verification (`ClassificationOutput`). Videos with `confidence < 0.70` or `is_aktu_or_ai_study == False` are rejected and recorded in the audit log.
3. **Modular Storage Abstraction & Direct S3 Presigned Uploads**: Web server containers never buffer or process raw video files. Client browsers upload directly to S3/R2 presigned URLs. Asynchronous FFmpeg workers transcode raw video into 1080p, 720p, 480p, and 360p multi-bitrate HLS streams, writing a master `.m3u8` playlist.
4. **Schema Strictness**: Syllabus units are strictly constrained to intervals $1 \le \text{unit\_number} \le 5$, with uniqueness enforced on `(subject_code, unit_number)`.
5. **Zero Hallucination Taxonomy**: Subject codes must match official university codes (`BCS301`, `BCS501`, `BAS101`, `BEE301`, etc.) or the reserved track tag `AI_GENERAL`.

---

## 2. High-Level Architecture Flow Diagrams

### 2.1. Quota-Conscious Ingestion Pipeline

```mermaid
flowchart TD
    A["Whitelisted Channel<br/>(Channel ID: UC...)"] --> B["Derive Uploads Playlist ID<br/>(Replace 'UC' with 'UU')"]
    B --> C["Call playlistItems.list<br/>(Cost: 1 Quota Unit)"]
    C --> D["Extract Video IDs & Snippets"]
    D --> E["Batch Query videos.list<br/>(Cost: 1 Unit / 50 Videos)"]
    E --> F["Deduplicate against PostgreSQL"]
    F --> G["Fetch Hindi/English Transcript<br/>(youtube-transcript-api)"]
    G --> H["Pass to Two-Stage AI Gatekeeper"]
```

### 2.2. Two-Stage AI Content Gatekeeper

```mermaid
flowchart TD
    A["Raw Ingested Video Metadata & Transcript"] --> B["Stage 1: Heuristic Keyword & Regex Screener"]
    B -- "Non-Educational / Gaming Flagged" --> R1["Audit Log: REJECTED (Heuristic Fail)"]
    B -- "Passed Keyword Screener" --> C["Stage 2: Gemini 3.8 Flash Structured Verification"]
    C --> D["Evaluate Classification Output<br/>(subject_code, unit_number, confidence, is_aktu_or_ai_study)"]
    D -- "confidence < 0.70 OR is_aktu_or_ai_study == false" --> R2["Audit Log: REJECTED (Gatekeeper Reject)"]
    D -- "confidence >= 0.70 AND is_aktu_or_ai_study == true" --> E["Stage 2 Gatekeeper APPROVED"]
    E --> F["Generate 768-d Vector Embedding<br/>(Summary + Topics)"]
    F --> G["Persist to PostgreSQL (pgvector) & Notify Redis"]
```

### 2.3. Native Student MP4 Direct Upload & HLS Transcoding Pipeline

```mermaid
flowchart TD
    Client["Student Client Browser"] -->|"1. Request Presigned URL"| API["FastAPI Web Server"]
    API -->|"2. Return S3 Presigned URL & Video ID"| Client
    Client -->|"3. Direct Multipart Upload (Raw MP4)"| S3["Cloudflare R2 / MinIO S3 (raw/)"]
    Client -->|"4. Notify Upload Complete"| API
    API -->|"5. Enqueue Transcode Job"| Redis[("Redis Task Queue")]
    Redis --> Worker["Celery / ARQ Worker Container"]
    Worker -->|"6. Pull Raw MP4"| S3
    Worker -->|"7. Execute FFmpeg Transcode<br/>(1080p, 720p, 480p, 360p)"| Worker
    Worker -->|"8. Write Multi-Bitrate HLS Chunks<br/>& master.m3u8"| S3HLS["S3 Storage (hls/)"]
    Worker -->|"9. Extract Audio & Run Whisper STT"| Whisper["Speech-to-Text"]
    Whisper -->|"10. Bilingual Transcript"| Classifier["Stage 2 AI Classifier"]
    Classifier -->|"11. Store Approved Video Metadata"| DB[("PostgreSQL 16")]
```

### 2.4. Dual Playback Engine Architecture

```mermaid
flowchart TD
    VideoSource{"video.source_type"}
    VideoSource -- "YOUTUBE" --> YT["YouTube IFrame API Playback<br/>(Direct Google Edge Delivery)"]
    VideoSource -- "NATIVE" --> HLS["Hls.js Adaptive Stream Engine<br/>(Reads master.m3u8 from CDN)"]
    
    YT --> Sync["Unified Player State Machine"]
    HLS --> Sync
    
    Sync --> Pos["Watch Progress Hook<br/>(Debounced 2s sync to /videos/{id}/progress)"]
    Sync --> Trans["Interactive Transcript Viewer<br/>(Synchronized auto-scroll & jump-to-timestamp)"]
```

---

## 3. Database Entity Relationship Diagram

```mermaid
erDiagram
    BRANCHES ||--o{ SUBJECTS : contains
    SUBJECTS ||--|{ UNITS : defines
    UNITS ||--o{ VIDEOS : categorizes
    VIDEOS ||--|| VIDEO_CLASSIFICATIONS : verified_by
    VIDEOS ||--o| VIDEO_TRANSCRIPTS : transcribed_as
    VIDEOS ||--o{ USER_PROGRESS : tracks
    CHANNEL_WHITELISTS ||--o{ QUOTA_LOGS : monitored_in

    BRANCHES {
        string code PK
        string name
        boolean is_active
        timestamp created_at
    }

    SUBJECTS {
        string code PK
        string name
        string branch_code FK
        int semester
        string syllabus_markdown
        boolean is_active
    }

    UNITS {
        uuid id PK
        string subject_code FK
        int unit_number "CHECK (1 <= unit_number <= 5)"
        string title
        json topics
        text summary
    }

    VIDEOS {
        uuid id PK
        string title
        text description
        string source_type "YOUTUBE | NATIVE"
        string source_url
        string youtube_video_id
        string s3_hls_master_url
        int duration_seconds
        string thumbnail_url
        int view_count
        timestamp created_at
    }

    VIDEO_CLASSIFICATIONS {
        uuid id PK
        uuid video_id FK
        string subject_code FK
        int unit_number
        boolean is_aktu_or_ai_study
        float confidence
        string status "PENDING | APPROVED | REJECTED"
        text summary
        json topics_covered
    }

    VIDEO_TRANSCRIPTS {
        uuid id PK
        uuid video_id FK
        string language
        text full_text
        json segments
    }

    USER_PROGRESS {
        uuid id PK
        string session_id
        uuid video_id FK
        int last_position_seconds
        boolean is_completed
        timestamp updated_at
    }

    CHANNEL_WHITELISTS {
        uuid id PK
        string channel_id
        string uploads_playlist_id
        string channel_title
        string branch_code
        boolean is_active
        timestamp last_synced_at
    }

    QUOTA_LOGS {
        uuid id PK
        string endpoint_called
        int units_consumed
        int daily_units_cumulative
        timestamp logged_at
    }
```

---

## 4. Directory & File Structure

```text
aktu-stream-ai/
├── docker-compose.yml
├── .env.example
├── README.md
├── PRD.md
├── ARCHITECTURE.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── redis.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── subject.py
│   │   │   ├── video.py
│   │   │   └── user_progress.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── classification.py
│   │   │   ├── subject.py
│   │   │   └── video.py
│   │   ├── services/
│   │   │   ├── classifier.py
│   │   │   ├── classifier_service.py
│   │   │   ├── youtube.py
│   │   │   ├── youtube_service.py
│   │   │   ├── storage.py
│   │   │   ├── storage_service.py
│   │   │   ├── transcoder_service.py
│   │   │   ├── taxonomy_service.py
│   │   │   ├── transcript_service.py
│   │   │   └── vector_search.py
│   │   ├── workers/
│   │   │   ├── celery_app.py
│   │   │   ├── tasks_ingest.py
│   │   │   ├── tasks_transcode.py
│   │   │   └── tasks.py
│   │   └── api/
│   │       └── v1/
│   │           ├── router.py
│   │           ├── api.py
│   │           └── endpoints/
│   │               ├── subjects.py
│   │               ├── videos.py
│   │               ├── search.py
│   │               └── submissions.py
│   └── tests/
│       ├── conftest.py
│       ├── test_api.py
│       ├── test_classifier.py
│       ├── test_schema_constraints.py
│       ├── test_storage_hls.py
│       └── test_youtube_quota.py
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── next.config.ts
    └── src/
        ├── app/
        │   ├── globals.css
        │   ├── layout.tsx
        │   ├── page.tsx
        │   ├── admin/
        │   │   └── ingestion/
        │   │       └── page.tsx
        │   ├── ai-track/
        │   │   └── page.tsx
        │   ├── branch/
        │   │   └── [branchId]/
        │   │       └── [semId]/
        │   │           └── [subjectCode]/
        │   │               └── page.tsx
        │   ├── search/
        │   │   └── page.tsx
        │   ├── subjects/
        │   │   ├── page.tsx
        │   │   └── [code]/
        │   │       └── page.tsx
        │   ├── upload/
        │   │   └── page.tsx
        │   └── watch/
        │       └── [videoId]/
        │           └── page.tsx
        ├── components/
        │   ├── layout/
        │   │   ├── Header.tsx
        │   │   ├── Navbar.tsx
        │   │   └── SidebarNav.tsx
        │   ├── player/
        │   │   ├── UnifiedPlayer.tsx
        │   │   ├── TranscriptViewer.tsx
        │   │   └── VideoPlayer.tsx
        │   ├── syllabus/
        │   │   ├── UnitTabs.tsx
        │   │   └── VideoCard.tsx
        │   └── video/
        │       └── VideoCard.tsx
        ├── hooks/
        │   ├── useWatchProgress.ts
        │   └── useSyllabusTree.ts
        ├── lib/
        │   ├── api-client.ts
        │   ├── api.ts
        │   ├── types.ts
        │   └── utils.ts
        └── types/
            ├── index.ts
            └── syllabus.ts
```

---

## 5. Technology Stack & Runtime Specifications

| Layer | Component | Specification |
| :--- | :--- | :--- |
| **Frontend** | Framework | Next.js 14 (App Router, Server & Client Components) |
| | Language | TypeScript 5.6 (strict mode) |
| | Styling & Icons | Tailwind CSS 3.4, Lucide React |
| | Video Playback | Hls.js 1.5 (Adaptive streaming) + YouTube IFrame API |
| **Backend** | Framework | FastAPI (Python 3.12+, async endpoints) |
| | ORM | SQLAlchemy 2.0 (asyncpg / aiosqlite driver) |
| | Data Validation | Pydantic v2 schemas |
| | Background Workers | Celery / ARQ with Redis 7 Broker |
| **Data & Storage** | Database | PostgreSQL 16 + `pgvector` extension |
| | Vector Embeddings | 768-dimensional semantic embeddings |
| | Cache & Queues | Redis 7 |
| | Object Storage | Cloudflare R2 / MinIO S3 (Direct presigned multipart) |
| | Transcoder | FFmpeg 6+ (Multi-bitrate 1080p, 720p, 480p, 360p HLS) |
| **AI Gatekeeper** | Model | Google Gemini 3.8 Flash via `google-genai` SDK |
| | Speech-to-Text | Whisper bilingual Hindi/English transcript extraction |
| | Quota Budget | Strict $\le 10,000$ daily units (No `search.list`) |

---

## 6. Verification and Test Results

- Backend Pytest Suite: **18/18 tests passing** (`test_youtube_quota.py`, `test_classifier.py`, `test_schema_constraints.py`, `test_storage_hls.py`, `test_api.py`).
- Frontend Build: **100% clean production build** with Next.js 14.2.15 (9 static/dynamic routes compiled).
- Zero hallucination validation: All seeded subjects strictly conform to official AKTU codes (`BCS301`, `BCS501`, `BAS101`, `BEE301`) and the reserved tag `AI_GENERAL`.
