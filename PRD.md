# Product Requirement Document (PRD) — AKTU Stream AI

## 1. Executive Summary
AKTU Stream AI is a dedicated, ad-free academic video platform built specifically for engineering students affiliated with Dr. A.P.J. Abdul Kalam Technical University (AKTU) and self-directed AI/ML learners. It solves two major pain points:
1. YouTube search algorithm pollution, distractive recommendations, and broken multi-part playlist structures for semester exam preparation.
2. Quota exhaustion and manual curation overhead by leveraging automated channel scraping (1-unit quota calls) paired with an automated Two-Stage AI Content Gatekeeper.

## 2. Targeted Users & Personas
- **AKTU Engineering Undergraduates (Semesters 1–8):** Students studying under syllabus schemes across CSE, AI/ML, IT, ECE, EE, and ME who require Unit 1 to Unit 5 targeted exam prep, numerical breakdowns, and previous year solution walkthroughs.
- **AI & Data Science Track Students:** Engineers seeking organized, production-grade AI curriculum (Foundational Math, Deep Learning, Transformers, MLOps, Prompt Engineering) unbundled from generic YouTube noise.
- **Verified Student Creators & Teaching Assistants:** Peer educators uploading clean lecture notes, lab demo captures, and revision crash courses directly to the platform.

## 3. Core Problems & Value Proposition
| Problem | Platform Solution |
| :--- | :--- |
| Distracting ads, clickbait titles, and incomplete playlists | Clean academic UI organized exclusively by Branch -> Semester -> Subject -> Unit |
| YouTube API Quota exhaustion (100 `search.list` calls/day limit) | Zero-search architecture: Whitelisted uploads playlist polling (`playlistItems.list`, 1 quota unit) |
| Irrelevant or non-educational content submitted by users | Two-stage AI Gatekeeper (LLM classification against official syllabus + transcript parsing) |
| Fragmented lecture materials | Unified video player supporting both embedded YouTube streams and native HLS (.m3u8) playback |

## 4. Key Functional Features

### 4.1. Syllabus Taxonomy Navigation
- Branch-wise selection: CSE, AI/ML, IT, ECE, EE, ME, CE.
- Semester breakdown (Semesters 1 through 8).
- Subject dashboard mapping official AKTU codes (e.g., `BCS301` Data Structures, `BCS501` DBMS, `BAS101` Engineering Physics).
- Unit tabs (Unit 1 to Unit 5) displaying categorized lectures, average watch duration, and completion status.

### 4.2. Ingestion & AI Gatekeeping Engine
- **Whitelisted Polling:** Scheduled jobs scraping uploads playlists (`UU...`) of verified channels (GateWay Classes, Education Point AKTU, I Tech World, etc.).
- **Metadata & Transcript Extraction:** Auto-retrieval of video snippet metadata and bilingual transcripts (Hindi/English) via `youtube-transcript-api`.
- **LLM Syllabus Matcher:** Zero-shot evaluation assigning exact subject code, unit number (1–5), confidence score, and 2-sentence summary.
- **Semantic Vector Storage:** 768-dimensional embeddings generated from transcript summaries for natural language syllabus search.

### 4.3. Unified Player & Interactive Study Experience
- Dual playback engine: Vidstack abstraction handling embedded YouTube IFrame and native adaptive HLS streams (.m3u8).
- Synchronized transcript view with jump-to-timestamp capability.
- Unit-wise watch tracking and completion progress stored per user session.

### 4.4. Student Uploads & HLS Transcoding Pipeline
- Direct browser-to-S3/R2 presigned multipart uploads for authenticated students.
- Asynchronous FFmpeg worker generating 480p, 720p, and 1080p HLS segments with an automated Whisper speech-to-text pipeline fed into the AI Gatekeeper.

## 5. Non-Functional Requirements
- **API Response Latency:** Under 100ms for cached syllabus trees and video metadata queries.
- **Search Query Latency:** Under 300ms for hybrid full-text and vector cosine similarity search.
- **Reliability:** Background workers must handle transient network issues and rate limits using exponential backoff.
- **Storage:** Object storage for transcoded chunks backed by global CDN edge caching.
