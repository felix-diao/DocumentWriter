from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from pathlib import Path
from datetime import datetime, timezone
import os
from utils.pdf_exporter import save_as_pdf
from utils.word_exporter import save_as_word


from models.request_models import (
    GenerateRequest,
    ExportRequest,
    DocumentWriteRequest,
)
from models.response_models import StandardResponse, DocumentData

BASE_DIR = Path(__file__).resolve().parent  # backend/
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"
PDF_DIR = STATIC_DIR / "pdfs"

app = FastAPI(title="Official Document LLM Demo",docs_url="/docs")

# # 挂载静态资源（/static/**）
# app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

# # --- 页面 ---
# @app.get("/", response_class=HTMLResponse)
# async def index(request: Request):
#     return templates.TemplateResponse("index.html", {"request": request})

# --- 生成公文文本（仅返回文本，不落盘）---
# @app.post("/api/generate")
# async def generate(req: GenerateRequest):
#     content = generate_document(req.title, req.requirement)
#     return JSONResponse({"content": content})

# # --- 导出为 PDF/Word（点击按钮时才生成文件）---
# @app.post("/api/export")
# async def export(req: ExportRequest):
#     PDF_DIR.mkdir(parents=True, exist_ok=True)
#     ts = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
#     safe_title = "".join(ch for ch in req.title if ch not in r'\/:*?"<>|') or "document"
#     filename = f"{safe_title}_{ts}"

#     if req.format.lower() == "pdf":
#         file_path = save_as_pdf(req.title, req.content, filename, out_dir=str(PDF_DIR))
#         ext = "pdf"
#     else:
#         file_path = save_as_word(req.title, req.content, filename, out_dir=str(PDF_DIR))
#         ext = "docx"

#     return JSONResponse({"fileUrl": f"/download/{filename}.{ext}"})
# # --- 下载文件 ---
# @app.get("/download/{filename}")
# async def download(filename: str):
#     path = PDF_DIR / filename
#     return FileResponse(str(path), filename=filename)


# --- 新增：公文写作接口 ---
@app.post("/document/write", response_model=StandardResponse[DocumentData])
async def document_write(req: DocumentWriteRequest):
    """
    POST /document/write
    {
        "prompt": "关于开展校园安全检查的通知，要求包含三条措施…",
        "documentType": "article",
        "tone": "formal",
        "language": "zh"
    }
    """
    try:
        # from document_generator import generate_document_by_prompt
        from llm_client.generators import generate_document_by_prompt
        content = generate_document_by_prompt(
            prompt=req.prompt,
            document_type=req.documentType,
            tone=req.tone or "formal",
            language=req.language or "zh",
        )

        return StandardResponse(
            success=True,
            data=DocumentData(
                content=content,
                wordCount=len(content),
                generatedAt=datetime.now(timezone.utc)
            ),
            message="文档生成成功"
        )
    except Exception as e:
        return StandardResponse(
            success=False,
            data=DocumentData(
                content="",
                wordCount=0,
                generatedAt=datetime.now(timezone.utc)
            ),
            message=f"生成失败：{e}"
        )
    
if __name__ == "__main__":
    import uvicorn
    # 直接 python app.py 即可
    uvicorn.run("app:app", host="127.0.0.1", port=8000)
