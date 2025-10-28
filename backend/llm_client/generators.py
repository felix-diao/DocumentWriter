from .client import LLMClient
from .config import LLMConfig
from .utils import map_doc_type, map_tone

_client = None
def get_client(cfg=None):
    global _client
    if _client is None:
        _client = LLMClient(cfg or LLMConfig())
    return _client

def generate_document(title: str, requirement: str) -> str:
    cli = get_client()
    if not cli.cfg.api_key:
        return f"{title}\n\n根据{requirement}要求，现制定如下通知：\n\n一、遵守规范格式；\n二、明确分工；\n三、认真落实。\n\n特此通知。"
    messages = [
        {"role": "system", "content": "你是一名资深公文写作助手。"},
        {"role": "user", "content": f"请写一份《{title}》，要求：{requirement}。"},
    ]
    return cli.chat(messages, max_tokens=1000)

def generate_document_by_prompt(prompt: str, document_type="article", tone="formal", language="zh") -> str:
    cli = get_client()
    msg = f"请用{ '中文' if language.startswith('zh') else '目标语言' }撰写一份{map_doc_type(document_type)}，语气偏向{map_tone(tone)}。需求如下：\n\n{prompt}"
    messages = [{"role": "system", "content": "你是一名中文写作助手。"},
                {"role": "user", "content": msg}]
    return cli.chat(messages, max_tokens=1200)
