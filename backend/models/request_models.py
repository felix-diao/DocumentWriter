from pydantic import BaseModel


class GenerateRequest(BaseModel):
    """生成公文请求体"""
    title: str
    requirement: str


class ExportRequest(BaseModel):
    """导出 PDF/Word 请求体"""
    title: str
    content: str
    format: str = "pdf"  # 可选 "pdf" 或 "word"


class DocumentWriteRequest(BaseModel):
    """AI 公文写作接口请求体"""
    prompt: str
    documentType: str  # 'article' | 'report' | 'summary' | 'email'
    tone: str | None = None  # 'professional' | 'casual' | 'formal'
    language: str | None = None  # e.g. 'zh', 'en'


from typing import Optional, Literal

class DocumentOptimizeRequest(BaseModel):
    content: str
    optimizationType: Literal['grammar', 'style', 'clarity', 'logic', 'format', 'tone', 'all'] = 'all'
    customInstruction: Optional[str] = None
    context: Optional[dict] = None