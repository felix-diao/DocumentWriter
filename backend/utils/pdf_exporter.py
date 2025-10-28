from fpdf import FPDF
from pathlib import Path
import os
import sys

def _find_cjk_font() -> str | None:
    """
    优先使用项目内字体，其次尝试常见系统字体。
    返回可用字体的绝对路径，找不到返回 None。
    """
    base_dir = Path(__file__).resolve().parent

    # 1) 项目内字体（推荐放这）
    candidates = [
        base_dir / "static" / "fonts" / "NotoSansSC-Regular.otf",
        base_dir / "static" / "fonts" / "msyh.ttc",
        base_dir / "static" / "fonts" / "SimSun.ttf",
        base_dir / "static" / "fonts" / "SimHei.ttf",
    ]

    # 2) Windows 常见中文字体
    win_fonts = [
        Path(r"C:\Windows\Fonts\msyh.ttc"),
        Path(r"C:\Windows\Fonts\simhei.ttf"),
        Path(r"C:\Windows\Fonts\simsun.ttc"),
        Path(r"C:\Windows\Fonts\msyh.ttf"),
    ]
    # 3) macOS 常见中文字体
    mac_fonts = [
        Path("/System/Library/Fonts/PingFang.ttc"),
        Path("/System/Library/Fonts/STHeiti Light.ttc"),
        Path("/Library/Fonts/Songti.ttc"),
        Path("/Library/Fonts/Heiti.ttc"),
        Path("/Library/Fonts/Arial Unicode.ttf"),
    ]
    # 4) Linux 常见中文字体（以 Noto 为主）
    linux_fonts = [
        Path("/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"),
        Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
        Path("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"),
        Path("/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"),
    ]

    if sys.platform.startswith("win"):
        candidates += win_fonts
    elif sys.platform == "darwin":
        candidates += mac_fonts
    else:
        candidates += linux_fonts

    for p in candidates:
        if p and p.exists():
            return str(p)
    return None


def save_as_pdf(title: str, content: str, filename: str, out_dir: str):
    """
    使用 fpdf2 生成支持中文的 PDF。
    必须加载一个支持中文的 TTF/OTF/ TTC 字体，并使用 uni=True。
    """
    out_dir_path = Path(out_dir)
    out_dir_path.mkdir(parents=True, exist_ok=True)
    out_path = out_dir_path / f"{filename}.pdf"

    pdf = FPDF()
    pdf.add_page()

    font_path = _find_cjk_font()
    if not font_path:
        # 给出明确错误，避免回退到 latin1 再报错
        raise RuntimeError(
            "未找到可用的中文字体。请在 backend/static/fonts/ 放置 NotoSansSC-Regular.otf "
            "或在本机安装中文字体（如 微软雅黑 msyh.ttc），并确保进程有读取权限。"
        )

    # 名称你可以随便起，这里用 'CJK'
    pdf.add_font("CJK", "", font_path, uni=True)
    pdf.set_font("CJK", size=16)
    pdf.multi_cell(0, 10, txt=title, align="C")
    pdf.ln(5)

    pdf.set_font("CJK", size=12)
    # multi_cell 自动换行（fpdf2 支持 unicode）
    pdf.multi_cell(0, 8, txt=content)

    pdf.output(str(out_path))
    return str(out_path)
