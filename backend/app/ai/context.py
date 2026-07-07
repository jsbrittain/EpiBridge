"""Context describing an Analysis Bundle supplied to AI providers during
review. This contains only non-sensitive metadata already known to EpiBridge
and deliberately excludes project information, user information, execution
history and dataset contents.
"""

from dataclasses import dataclass, field


@dataclass
class AIReviewContext:
    runtime: str = ""
    entrypoint: str = ""
    resource_identifiers: list[str] = field(default_factory=list)
