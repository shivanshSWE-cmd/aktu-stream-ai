import logging
import re
from typing import Any, Dict, List, Optional
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound

logger = logging.getLogger(__name__)


class TranscriptService:
    """
    Handles fetching and processing of video transcripts via youtube-transcript-api.
    Supports Hindi ('hi'), English ('en'), and Hinglish/transliterated subtitles.
    Extracts structured segments and first 4,000 characters for the Stage-2 Classifier.
    """

    SUPPORTED_LANGUAGES = ["hi", "en", "hi-Latn", "en-IN", "en-US", "en-GB"]

    @classmethod
    def clean_text(cls, text: str) -> str:
        """Cleans and normalizes transcript text."""
        # Replace non-breaking spaces and linebreaks
        cleaned = text.replace("\xa0", " ").replace("\n", " ")
        # Remove consecutive whitespaces
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned

    @classmethod
    def fetch_youtube_transcript(
        cls, youtube_id: str, max_chars_for_classifier: int = 4000
    ) -> Dict[str, Any]:
        """
        Attempts to fetch captions in Hindi or English (manual or auto-generated).
        Returns dict containing:
        - full_text: string
        - segments: list of {"start": float, "duration": float, "text": str}
        - language: str
        - classifier_snippet: string (first 4,000 characters)
        """
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(youtube_id)
            transcript_obj = None

            # 1. Try finding manually created Hindi or English transcript
            try:
                transcript_obj = transcript_list.find_manually_created_transcript(cls.SUPPORTED_LANGUAGES)
            except NoTranscriptFound:
                pass

            # 2. Try finding generated transcripts
            if not transcript_obj:
                try:
                    transcript_obj = transcript_list.find_generated_transcript(cls.SUPPORTED_LANGUAGES)
                except NoTranscriptFound:
                    pass

            # 3. If any transcript exists in another language, translate to English
            if not transcript_obj:
                for t in transcript_list:
                    if t.is_translatable:
                        transcript_obj = t.translate("en")
                        break

            if not transcript_obj:
                logger.info(f"No usable transcript found for video {youtube_id}. Generating fallback.")
                return cls._generate_empty_transcript()

            raw_data = transcript_obj.fetch()
            language = transcript_obj.language_code

            segments: List[Dict[str, Any]] = []
            full_text_parts: List[str] = []

            for item in raw_data:
                clean_chunk = cls.clean_text(item.get("text", ""))
                if clean_chunk:
                    segments.append({
                        "start": round(float(item.get("start", 0.0)), 2),
                        "duration": round(float(item.get("duration", 0.0)), 2),
                        "text": clean_chunk,
                    })
                    full_text_parts.append(clean_chunk)

            full_text = " ".join(full_text_parts)
            classifier_snippet = full_text[:max_chars_for_classifier]

            return {
                "language": language,
                "full_text": full_text,
                "segments": segments,
                "classifier_snippet": classifier_snippet,
            }

        except (TranscriptsDisabled, NoTranscriptFound) as e:
            logger.warning(f"Transcripts unavailable for {youtube_id}: {e}")
            return cls._generate_empty_transcript()
        except Exception as e:
            logger.error(f"Error fetching transcript for {youtube_id}: {e}")
            return cls._generate_empty_transcript()

    @classmethod
    def _generate_empty_transcript(cls) -> Dict[str, Any]:
        """Provides a safe empty structure when subtitles are disabled or unavailable."""
        return {
            "language": "en",
            "full_text": "",
            "segments": [],
            "classifier_snippet": "",
        }
