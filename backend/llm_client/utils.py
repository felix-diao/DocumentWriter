def map_doc_type(tp: str) -> str:
    return {
        "notice": "通知",
        "bulletin": "通报",
        "request": "请示",
        "report": "报告",
        "letter": "函",
        "meeting": "会议纪要",
    }.get((tp or "").lower(), "通知")

def map_tone(t: str) -> str:
    return {
        "formal": "正式",
        "professional": "专业",
        "casual": "自然",
        "friendly": "亲切",
        "concise": "简洁",
    }.get((t or "").lower(), "正式")
