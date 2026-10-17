# Technical Decisions, Library Justifications & Alternatives — AKTU Stream AI

This document outlines the architectural trade-offs, library selection criteria, and evaluated alternatives across the **AKTU Stream AI** platform.

---

## 1. Backend Framework: FastAPI (Python 3.12+)

- **Decision:** Use **FastAPI** with `asyncio`, Pydantic v2 schemas, and async SQLAlchemy 2.0.
- **Why Chosen:**
  - **Native Asynchronous Runtime:** Native `async`/`await` support with high-throughput asynchronous database drivers (`asyncpg`, `aiosqlite`) ensures high concurrency during peak exam times without thread pool exhaustion.
  - **Pydantic v2 Structured Output:** Gemini 3.8 Flash gatekeeper responses and classification payloads are parsed, validated, and type-checked with high performance using C-based Pydantic core.
  - **Built-in Interactive Documentation:** Native OpenAPI 3.1 and Swagger UI generation at `/docs` speeds up frontend-backend integration and API contract verification.
  - **Lightweight Footprint:** Low container memory overhead (~60MB baseline) ideal for Dockerized production deployments.
- **Alternatives Evaluated:**
  - *Django / Django REST Framework (DRF):* Mature ecosystem, but substantially heavier memory footprint. Django's async ORM remains less flexible for advanced asynchronous session lifecycle patterns than SQLAlchemy 2.0, and request throughput is slower under streaming workloads.
  - *Node.js / Express or Fastify:* High asynchronous I/O performance, but lacks native first-class ecosystem support for Python machine learning libraries, Hindi/English transcript processing tools (`youtube-transcript-api`), and vector embedding pipelines.

---

## 2. Primary Database: PostgreSQL 16 + `pgvector`

- **Decision:** Use **PostgreSQL 16** with the **`pgvector`** extension for both relational metadata and 768-dimensional vector cosine search.
- **Why Chosen:**
  - **Unified Data Plane (Zero Data Duplication):** Eliminates the need to synchronize state across a relational database and an external vector database. Video records, syllabi, unit intervals, and embeddings live in the same ACID-compliant engine.
  - **Transactional Integrity:** Foreign key constraints (`subjects(code)`, `units(id)`) and database check constraints (`1 <= unit_number <= 5`) are enforced transactionally alongside embeddings.
  - **Operational Simplicity & Cost Efficiency:** AKTU's catalog comprises thousands to tens of thousands of video lectures. PostgreSQL 16 with HNSW/IVFFlat indexes easily delivers `< 50ms` vector search latency at this scale without paying high monthly SaaS fees for dedicated vector clusters.
- **Alternatives Evaluated:**
  - *Pinecone / Milvus / Qdrant:* Excellent performance at 10M+ scale, but introduces distributed consistency risks, extra infrastructure costs, and synchronization overhead for a focused academic catalog under 100,000 videos.
  - *MongoDB:* Flexible document store, but enforces weaker relational integrity constraints for strict branch-semester-subject hierarchies and lacks native ACID joins for units and audit records.

---

## 3. Frontend Framework: Next.js 14+ (App Router, TypeScript Strict)

- **Decision:** Use **Next.js** with App Router, React Server Components (RSC), and strict TypeScript mode.
- **Why Chosen:**
  - **Search Engine Indexability (SEO):** Server-Side Rendering (SSR) ensures that all AKTU course codes (`BCS501`, `BCS301`, `BAS101`) and unit topic pages are pre-rendered into valid HTML, ensuring indexing by Google search for engineering students.
  - **Fast Initial Page Paint on Mobile:** AKTU undergraduates predominantly access lectures via mobile devices on fluctuating campus Wi-Fi or cellular connections. Pre-rendered HTML renders immediately before client hydration.
  - **Optimized Layout Routing:** Deep nested routing (`/branch/[branchId]/[semId]/[subjectCode]`) maps naturally to Next.js App Router route segments.
- **Alternatives Evaluated:**
  - *Vite + React SPA:* Client-side rendering ships an empty HTML body `<div id="root"></div>`. Search crawlers index pages poorly, and initial load on budget student mobile devices experiences noticeable layout shifts.
  - *Remix:* Strong nested loader paradigm, but smaller pre-built component ecosystem and video player abstractions compared to the Next.js App Router ecosystem.

---

## 4. Video Playback Architecture: Vidstack / Adaptive Player Abstraction

- **Decision:** Use a unified player abstraction supporting both **YouTube embedded streams** (via IFrame API) and **native adaptive HLS `.m3u8` streams** (`hls.js`).
- **Why Chosen:**
  - **Dual Source Support:** Seamlessly abstracts YouTube lectures and student-uploaded MP4 files under a single user experience.
  - **Responsive Scrubber & Synchronized Seek:** Exposes unified `onTimeUpdate` and `seekTo` callbacks that synchronize with the transcript viewer regardless of video origin.
  - **Adaptive Bitrate Levels:** Automatically adjusts between 1080p, 720p, 480p, and 360p based on student network bandwidth, preventing buffering during mobile playback.
- **Alternatives Evaluated:**
  - *Video.js:* Battle-tested, but older architecture with a heavier bundle size and imperative DOM manipulation patterns that clash with React 18/19 concurrent rendering.
  - *Raw HTML5 `<video>` + Standard YouTube IFrame:* Forces maintaining two divergent player control bars, volume sliders, keyboard shortcuts, and progress analytics hooks.

---

## 5. Background Task Engine: Celery / ARQ + Redis 7 Broker

- **Decision:** Use **Redis 7** as an in-memory cache and queue broker paired with **Celery / ARQ workers**.
- **Why Chosen:**
  - **Process Isolation:** CPU-intensive FFmpeg transcoding and speech-to-text jobs run in dedicated background worker containers, completely isolated from web server request-response loops.
  - **Sub-Millisecond Progress Caching:** Watch progress synchronization (debounced every 2 seconds) writes to Redis before flushing to PostgreSQL, guaranteeing sub-5ms API latency.
  - **Reliable Retry & Backoff:** Background jobs support exponential backoff, preventing cascading failures when external APIs or storage endpoints experience transient network hiccups.
- **Alternatives Evaluated:**
  - *FastAPI `BackgroundTasks`:* Executes in the same Python process as the HTTP server. Heavy operations (e.g. video processing or large transcript parsing) lock the GIL and cause server latency spikes or OOM crashes.
  - *Temporal:* Enterprise-grade distributed workflow engine, but introduces substantial operational and setup complexity for the current architectural scale.

---

## 6. YouTube Transcript Ingestion: `youtube-transcript-api`

- **Decision:** Extract automated and manual bilingual subtitles (Hindi & English) via `youtube-transcript-api`.
- **Why Chosen:**
  - **Zero Quota Consumption:** Operates completely outside the YouTube Data API v3 quota budget (0 quota units consumed), preserving the 10,000 units/day budget for `playlistItems.list` and `videos.list`.
  - **Bilingual Hindi/English Coverage:** Indian engineering creators frequently speak in "Hinglish" or English with Hindi titles. Capturing existing captions extracts accurate technical definitions at zero compute cost.
  - **Sub-Second Extraction:** Captions are retrieved in under 1 second, speeding up the Stage-2 AI Gatekeeper classifier evaluation.
- **Alternatives Evaluated:**
  - *Official YouTube Data API `captions.list`:* Requires user OAuth credentials (infeasible for indexing public educational channels with server API keys) and consumes quota.
  - *Local Whisper Model on all ingested videos:* Running Whisper audio transcription on thousands of YouTube videos requires heavy GPU infrastructure and cloud compute costs. Reserving Whisper exclusively for native student MP4 uploads cuts operational GPU compute requirements by > 90%.

---

## 7. Architectural Trade-off Summary Matrix

| Decision Domain | Selected Architecture | Alternative Considered | Primary Trade-Off Rationale |
| :--- | :--- | :--- | :--- |
| **API Framework** | FastAPI (Async Python 3.12) | Django / Node.js | Pydantic v2 schemas + native async DB + ML/AI library integration |
| **Database** | PostgreSQL 16 + `pgvector` | Pinecone / MongoDB | Single ACID engine for syllabus hierarchy + 768-d vector search |
| **Frontend** | Next.js 14 App Router | Vite SPA / Remix | Server-Side Pre-rendering for AKTU SEO + instant mobile paint |
| **Player Engine** | Unified Vidstack / Hls.js | Video.js / Dual UI | Unified player API handling both YouTube IFrames and HLS `.m3u8` |
| **Task Queue** | Redis 7 + Celery/ARQ | FastAPI BackgroundTasks | Process isolation prevents FFmpeg transcode from blocking HTTP |
| **Transcripts** | `youtube-transcript-api` | Whisper for all / API | Zero quota units consumed; Whisper reserved for native student MP4s |
| **Ingestion Quota** | `playlistItems.list` (UU) | `search.list` | Saves 99% API quota (1 unit vs 100 units); strictly eliminates quota exhaustion |
