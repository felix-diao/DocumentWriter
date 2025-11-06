from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from . import __init__  # keep package
from ..db import Base


class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    key = Column(String, nullable=True, unique=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class KnowledgeItem(Base):
    __tablename__ = "knowledge_items"

    id = Column(Integer, primary_key=True, index=True)
    # 原文件名
    original_name = Column(String, nullable=False)
    # 存储文件名（磁盘文件名）
    stored_name = Column(String, nullable=False)
    # 可访问 URL（通常由 /static 挂载）
    url = Column(String, nullable=False)
    # MIME 类型
    mime_type = Column(String, nullable=True)
    # 文件大小（字节）
    size = Column(Integer, nullable=True)
    # 标签（JSON 字符串或以逗号分隔的字符串）
    tags = Column(String, nullable=True, default="[]")
    # 创建时间
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
