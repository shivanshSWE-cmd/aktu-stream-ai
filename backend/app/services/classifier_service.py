import json
import logging
import re
from typing import Any, Dict, Optional
from google import genai
from google.genai import types

from app.core.config import get_settings
from app.schemas.schemas import ClassificationOutput
from app.services.taxonomy_service import VALID_SUBJECT_CODES, get_curriculum_text_for_prompt

logger = logging.getLogger(__name__)
settings = get_settings()


class HeuristicScreener:
    """
    Stage-1 Fast Pre-filter:
    Scans metadata (title, channel, tags, description) to eliminate obvious spam,
    gaming, vlogs, and non-educational videos before making expensive LLM calls.
    """

    AKTU_KEYWORDS = [
        "aktu", "uptu", "dr. a.p.j", "abdul kalam", "b.tech", "btech",
        "engineering", "semester", "sem", "unit 1", "unit 2", "unit 3",
        "unit 4", "unit 5", "one shot", "syllabus", "pyq", "gateway classes",
        "knowledge gate", "neso academy", "engineering wallah", "gate smashers"
    ]

    AI_STUDY_KEYWORDS = [
        "machine learning", "deep learning", "neural network", "artificial intelligence",
        "pytorch", "tensorflow", "transformer", "nlp", "computer vision", "backpropagation",
        "gradient descent", "linear algebra for ml", "data structures", "dbms", "operating system"
    ]

    REJECTION_INDICATORS = [
        "gameplay", "minecraft", "vlog", "prank", "roast", "pubg", "bgmi",
        "unboxing", "music video", "movie trailer", "status song", "reaction video"
    ]

    @classmethod
    def screen(cls, title: str, description: str, channel_title: str, tags: list[str]) -> tuple[bool, str]:
        """
        Returns (passes_stage_1, reason)
        """
        combined = f"{title} {description} {channel_title} {' '.join(tags)}".lower()

        # Check for immediate disqualifiers
        for spam_word in cls.REJECTION_INDICATORS:
            if re.search(rf"\b{re.escape(spam_word)}\b", combined):
                return False, f"Matched non-academic indicator: '{spam_word}'"

        # Check for explicit AKTU or AI/engineering relevance
        has_aktu = any(kw in combined for kw in cls.AKTU_KEYWORDS)
        has_ai = any(kw in combined for kw in cls.AI_STUDY_KEYWORDS)
        has_subject_code = any(code.lower() in combined for code in VALID_SUBJECT_CODES)

        if has_aktu or has_ai or has_subject_code:
            return True, "Passed Stage-1 heuristic screening"

        return False, "Failed Stage-1: No academic AKTU or AI/ML keywords detected"


class TwoStageClassifier:
    """
    Two-Stage Content Gatekeeping AI Classifier:
    - Stage 1: Fast Heuristic screener
    - Stage 2: Deep LLM Verification via Gemini 3.8 Flash using structured output
    - Gatekeeper Rule: Must have is_aktu_or_ai_study == True and confidence >= 0.70.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self._genai_client = None

    def _get_client(self):
        if not self._genai_client and self.api_key:
            self._genai_client = genai.Client(api_key=self.api_key)
        return self._genai_client

    async def classify_video(
        self,
        title: str,
        channel_title: str,
        description: str,
        tags: list[str],
        transcript_snippet: str = "",
        duration_seconds: int = 0,
    ) -> ClassificationOutput:
        """
        Executes full two-stage verification on a candidate video.
        """
        # --- STAGE 1: Fast Heuristic Pre-filter ---
        passes_stage1, stage1_reason = HeuristicScreener.screen(
            title=title, description=description, channel_title=channel_title, tags=tags
        )

        if not passes_stage1:
            logger.info(f"Video '{title}' rejected at Stage 1: {stage1_reason}")
            return ClassificationOutput(
                is_aktu_or_ai_study=False,
                subject_code="AI_GENERAL",
                unit_number=1,
                confidence=0.15,
                summary=f"Non-academic content: {stage1_reason}",
                rejection_reason=stage1_reason,
                topics_covered=[]
            )

        # --- STAGE 2: Deep LLM Structured Output Verification ---
        client = self._get_client()
        if not client:
            logger.warning("Gemini API key not configured. Using intelligent deterministic fallback.")
            return self._deterministic_fallback_classifier(
                title=title,
                description=description,
                channel_title=channel_title,
                transcript_snippet=transcript_snippet
            )

        curriculum_ref = get_curriculum_text_for_prompt()
        prompt = f"""
You are the Chief Academic Evaluator and Verification Gatekeeper for AKTU Stream AI.
Your job is to strictly classify whether the following lecture video belongs to the Dr. A.P.J. Abdul Kalam Technical University (AKTU) B.Tech engineering curriculum or official AI/ML study track.

### OFFICIAL AKTU CURRICULUM SYLLABUS:
{curriculum_ref}

### VIDEO DETAILS TO EVALUATE:
- Title: {title}
- Channel: {channel_title}
- Duration: {duration_seconds} seconds
- Description: {description[:1000]}
- Cleaned Transcript Snippet (First 4,000 chars):
{transcript_snippet[:4000] if transcript_snippet else "[No transcript provided - evaluate from metadata]"}

### STRICT INSTRUCTIONS:
1. Verify if the content teaches an AKTU B.Tech subject (e.g., BCS501, BCS301, BAS101, etc.) or core AI/ML track.
2. Select the EXACT subject_code from the official curriculum list. If it is high-level AI/ML foundational study not mapped to a specific AKTU code, use 'AI_GENERAL'. NEVER invent a fake subject code!
3. Identify the unit_number strictly between 1 and 5.
4. Calculate a calibrated confidence score (0.00 to 1.00). If the video is clickbait, gaming, or general entertainment, set is_aktu_or_ai_study to false and confidence < 0.70.
5. Provide a concise academic summary and topics covered.
"""

        try:
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_json_schema=ClassificationOutput.model_json_schema(),
                    temperature=0.1,
                ),
            )

            result = ClassificationOutput.model_validate_json(response.text)

            # Ensure valid subject code from taxonomy
            if result.subject_code not in VALID_SUBJECT_CODES:
                logger.warning(
                    f"Model returned invalid subject code '{result.subject_code}'. Normalizing to AI_GENERAL."
                )
                result.subject_code = settings.RESERVED_AI_CODE

            return result

        except Exception as e:
            logger.error(f"Error during Gemini Stage-2 classification: {e}")
            return self._deterministic_fallback_classifier(
                title=title,
                description=description,
                channel_title=channel_title,
                transcript_snippet=transcript_snippet
            )

    def _deterministic_fallback_classifier(
        self, title: str, description: str, channel_title: str, transcript_snippet: str
    ) -> ClassificationOutput:
        """
        Rule-based deterministic classifier used when Gemini API key is offline or in testing.
        Accurately maps official codes (BCS501, BCS301, BAS101, etc.) and unit numbers.
        """
        combined = f"{title} {description} {transcript_snippet}".upper()

        detected_code = settings.RESERVED_AI_CODE
        for code in VALID_SUBJECT_CODES:
            if code in combined:
                detected_code = code
                break

        # If not explicitly named by code, search for topic matches
        if detected_code == settings.RESERVED_AI_CODE:
            if "DBMS" in combined or "DATABASE" in combined or "RELATIONAL ALGEBRA" in combined:
                detected_code = "BCS501"
            elif "DATA STRUCTURE" in combined or "LINKED LIST" in combined or "AVL TREE" in combined:
                detected_code = "BCS301"
            elif "OPERATING SYSTEM" in combined or "DEADLOCK" in combined or "CPU SCHEDULING" in combined:
                detected_code = "BCS401"
            elif "ENGINEERING PHYSICS" in combined or "QUANTUM" in combined or "RELATIVISTIC" in combined:
                detected_code = "BAS101"

        # Detect Unit Number (1 to 5)
        detected_unit = 1
        unit_match = re.search(r"\bUNIT\s*([1-5])\b", combined)
        if unit_match:
            detected_unit = int(unit_match.group(1))

        # Check Gatekeeper confidence
        is_academic = any(
            kw in combined for kw in ["AKTU", "UPTU", "SEMESTER", "GATEWAY", "ENGINEERING", "B.TECH", "ALGORITHM"]
        )

        confidence = 0.95 if is_academic else 0.50
        is_approved = is_academic and (confidence >= settings.CLASSIFIER_CONFIDENCE_THRESHOLD)

        return ClassificationOutput(
            is_aktu_or_ai_study=is_approved,
            subject_code=detected_code,
            unit_number=detected_unit,
            confidence=confidence,
            summary=f"Automated evaluation for {title}: covers {detected_code} Unit {detected_unit} curriculum.",
            rejection_reason=None if is_approved else "Low confidence score or non-AKTU engineering scope",
            topics_covered=[f"{detected_code} Core Concept", f"Unit {detected_unit} Lecture"]
        )
