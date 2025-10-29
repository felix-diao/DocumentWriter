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
    messages = [{"role": "system", "content": "你是一名中文写作助手。字数要在 1000 字以上"},
                {"role": "user", "content": msg}]
    return cli.chat(messages, max_tokens=1200)

# --- 新增优化类型映射 ---
OPTIMIZATION_MAP = {
    "grammar": "纠正语法错误和标点使用",
    "style": "优化文风，使表达更自然流畅",
    "clarity": "提升表达清晰度，避免歧义",
    "logic": "梳理逻辑，使结构更严谨有条理",
    "format": "规范文本格式，使排版更标准",
    "tone": "调整语气，使语气更正式或更符合语境",
    "all": "全面优化，包括语法、文风、逻辑、格式等各方面"
}


def optimize_document(content: str, optimization_type: str = "all", custom_instruction: str = None) -> str:
    """
    使用大模型对文本进行优化。
    如果有 custom_instruction，则优先使用自定义指令。
    否则根据 optimization_type 自动生成优化目标说明。
    """
    cli = get_client()
    
    # 构造提示语
    system_prompt = "你是一名专业的中文文字编辑助手，擅长文字润色、语法修正、逻辑优化和格式规范。"
    
    if custom_instruction:
        # 用户自定义要求
        user_prompt = f"请根据以下自定义要求优化这段文本：{custom_instruction}\n\n原文如下：\n{content}"
    else:
        # 根据类型生成中文说明
        type_desc = OPTIMIZATION_MAP.get(optimization_type, "全面优化文本")
        user_prompt = f"请对以下文本进行{type_desc}，并返回优化后的版本，不要解释或分析。\n\n原文如下：\n{content}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    return cli.chat(messages, max_tokens=1000)