import json
import os
import urllib.error
import urllib.request
from pathlib import Path

from app.ai.base import AIProvider, AIReviewResult
from app.ai.context import AIReviewContext

SOURCE_EXTENSIONS = {".py", ".R", ".r", ".sh", ".js", ".ipynb", ".txt", ".md"}

REVIEW_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "assessment": {"type": "string"},
        "assessment_confidence": {
            "type": "string",
            "enum": ["High", "Medium", "Low"],
        },
        "reviewer_notes": {"type": "string"},
    },
    "required": [
        "summary",
        "assessment",
        "assessment_confidence",
        "reviewer_notes",
    ],
}

REVIEW_PROMPT = (
    "You are an assistant reviewing an uploaded Analysis Bundle "
    "for the EpiBridge secure research platform. "
    "Your purpose is to help researchers and platform reviewers "
    "understand what this bundle appears to do based only on "
    "the supplied metadata and source code. "
    "Do not speculate about unseen datasets, execution results, "
    "or outcomes.\n\n"
    "{bundle_metadata}\n\n"
    "Source files:\n\n"
    "{source_code}\n\n"
    "Provide:\n"
    "1. A short natural-language summary (2-3 sentences) "
    "of what the analysis appears to do.\n"
    "2. An advisory assessment: either that no behaviours "
    "were identified that would normally require additional "
    "manual review, or that one or more behaviours were "
    "identified that merit manual review before execution.\n"
    "3. Assessment confidence: How confident are you that your "
    "assessment accurately reflects the uploaded Analysis Bundle "
    "based solely on the supplied metadata and source code? "
    "(High, Medium, or Low — not confidence that the code is "
    "correct or safe, only confidence in your interpretation "
    "of the bundle.)\n"
    "4. Reviewer notes describing observable behaviours that "
    "influenced your assessment (external process execution, "
    "shell commands, network access, unusual filesystem access, "
    "dynamic code execution, unusual dependencies). "
    "If nothing notable, return a sentence stating that "
    'clearly (e.g. "No notable behaviours observed."). '
    "Never leave this field empty.\n\n"
    "The assessment must be based solely on the supplied "
    "Analysis Bundle metadata and uploaded source code. "
    "Do not infer anything about the research data, "
    "execution results, scientific validity, or security "
    "beyond observable behaviour. "
    "The assessment is simply a recommendation about whether "
    "the bundle appears routine or whether its observable "
    "behaviour merits closer human inspection.\n\n"
    "Respond ONLY with valid JSON in this exact format "
    "(no markdown, no code fences):\n"
    '{{"summary": "...", "assessment": "...", '
    '"assessment_confidence": "High|Medium|Low", '
    '"reviewer_notes": "..."}}'
)


class OllamaProvider(AIProvider):
    def __init__(self, base_url: str, model: str = "llama3.2"):
        self.base_url = base_url.rstrip("/")
        self.model = model

    def review(
        self, analysis_dir: Path, context: AIReviewContext | None = None
    ) -> AIReviewResult:
        if not analysis_dir.is_dir():
            return AIReviewResult(
                errors=[f"Analysis directory not found: {analysis_dir}"]
            )

        source_code = self._read_source_files(analysis_dir)
        if not source_code.strip():
            return AIReviewResult(errors=["No source files found in analysis bundle"])

        metadata = self._build_metadata(context or AIReviewContext())
        prompt = REVIEW_PROMPT.format(
            bundle_metadata=metadata,
            source_code=source_code,
        )

        try:
            response = self._call_ollama(prompt)
        except urllib.error.URLError:
            return AIReviewResult(errors=["AI provider unreachable"])
        except urllib.error.HTTPError as e:
            return AIReviewResult(errors=[f"AI provider returned HTTP {e.code}"])
        except OSError:
            return AIReviewResult(errors=["AI provider unreachable"])

        try:
            data = json.loads(response)
        except (json.JSONDecodeError, ValueError):
            return AIReviewResult(errors=["Failed to parse AI response"])

        summary = data.get("summary", "")
        assessment = data.get("assessment", "")
        assessment_confidence = data.get("assessment_confidence", "")
        reviewer_notes = data.get("reviewer_notes", "")

        if not summary:
            return AIReviewResult(errors=["AI response missing summary"])

        if assessment_confidence not in ("High", "Medium", "Low"):
            assessment_confidence = "Medium"

        return AIReviewResult(
            summary=summary,
            assessment=assessment,
            assessment_confidence=assessment_confidence,
            reviewer_notes=reviewer_notes,
        )

    def _build_metadata(self, context: AIReviewContext) -> str:
        lines = ["Analysis Bundle"]
        lines.append(f"Runtime:      {context.runtime}")
        lines.append(f"Entrypoint:   {context.entrypoint}")
        if context.resource_identifiers:
            lines.append("Declared Data Resources:")
            for r in context.resource_identifiers:
                lines.append(f"  - {r}")
        return "\n".join(lines)

    def _read_source_files(self, analysis_dir: Path) -> str:
        parts = []
        for root, _dirs, files in os.walk(analysis_dir):
            for fname in sorted(files):
                ext = os.path.splitext(fname)[1]
                if ext not in SOURCE_EXTENSIONS:
                    continue
                fpath = os.path.join(root, fname)
                try:
                    with open(fpath, "r", errors="replace") as f:
                        content = f.read()
                except Exception:
                    continue
                rel = os.path.relpath(fpath, analysis_dir)
                parts.append(f"--- {rel} ---\n{content}")
        return "\n\n".join(parts)

    def _call_ollama(self, prompt: str) -> str:
        body = json.dumps(
            {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "format": REVIEW_RESPONSE_SCHEMA,
            }
        ).encode("utf-8")

        req = urllib.request.Request(
            f"{self.base_url}/api/generate",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode("utf-8"))

        return result.get("response", "")
