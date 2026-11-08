"""Per-request cost estimate. Rates live in config; this only multiplies."""
from __future__ import annotations

from dataclasses import dataclass, field

from vojo_speech import config


@dataclass
class CostLog:
    items: list[dict] = field(default_factory=list)

    def transcription(self, provider: str, seconds: float) -> None:
        rate = {"deepgram": config.DEEPGRAM_PER_MIN, "assemblyai": config.ASSEMBLYAI_PER_MIN}.get(provider, 0.0)
        self.items.append({"step": f"transcribe:{provider}", "usd": round(seconds / 60.0 * rate, 5)})

    def claude(self, step: str, in_tokens: int, out_tokens: int) -> None:
        usd = in_tokens / 1e6 * config.CLAUDE_IN_PER_MTOK + out_tokens / 1e6 * config.CLAUDE_OUT_PER_MTOK
        self.items.append({"step": f"claude:{step}", "in_tokens": in_tokens, "out_tokens": out_tokens, "usd": round(usd, 5)})

    @property
    def total(self) -> float:
        return round(sum(i["usd"] for i in self.items), 5)

    def to_dict(self) -> dict:
        return {"items": self.items, "total_usd": self.total}
