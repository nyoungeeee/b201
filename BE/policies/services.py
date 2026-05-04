from dataclasses import dataclass
from datetime import date
from functools import lru_cache
from pathlib import Path

from django.conf import settings


@dataclass(frozen=True)
class PolicyDocument:
    type: str
    title: str
    version: str
    effective_date: date
    content: str


class PolicyDocumentService:
    DOCUMENT_DIR = Path(settings.BASE_DIR) / "policies" / "documents"

    DOCUMENTS = {
        "terms": {
            "title": "서비스 이용약관",
            "version": "1.0",
            "effective_date": date(2026, 5, 4),
            "filename": "terms.md",
        },
        "privacy": {
            "title": "개인정보 처리방침",
            "version": "1.0",
            "effective_date": date(2026, 5, 4),
            "filename": "privacy.md",
        },
    }

    @classmethod
    @lru_cache(maxsize=2)
    def get_document(cls, document_type: str) -> PolicyDocument:
        document_meta = cls.DOCUMENTS[document_type]
        document_path = cls.DOCUMENT_DIR / document_meta["filename"]

        return PolicyDocument(
            type=document_type,
            title=document_meta["title"],
            version=document_meta["version"],
            effective_date=document_meta["effective_date"],
            content=document_path.read_text(encoding="utf-8").strip(),
        )
