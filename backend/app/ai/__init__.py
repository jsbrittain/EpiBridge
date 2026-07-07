from app.ai.base import AIProvider, AIReviewResult
from app.ai.context import AIReviewContext
from app.ai.ollama import OllamaProvider
from app.core.config import settings


def get_ai_provider() -> AIProvider | None:
    if not settings.ai_assist_enabled:
        return None
    return OllamaProvider(
        base_url=settings.ollama_base_url,
        model=settings.ollama_model,
    )


__all__ = [
    "AIProvider",
    "AIReviewContext",
    "AIReviewResult",
    "OllamaProvider",
    "get_ai_provider",
]
