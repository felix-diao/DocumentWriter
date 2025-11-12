from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Generic, TypeVar

T = TypeVar("T")

class BaseData(BaseModel):
    """所有 data 模型的基类"""
    pass


class StandardResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T]
    message: str


# 具体接口的 data 结构
class DocumentData(BaseData):
    content: str
    wordCount: int
    generatedAt: datetime
    pdfUrl: Optional[str] = None
    wordUrl: Optional[str] = None

# 文档优化接口的数据结构（只保留 content）
class DocumentDataOptimize(BaseData):
    content: str
