"""
MarkItDown Desktop - FastAPI Backend
Handles file upload and conversion to Markdown using Microsoft's markitdown library.
"""
import asyncio
import shutil
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from markitdown import MarkItDown

app = FastAPI(title="MarkItDown Desktop", version="1.0.0")

STATIC_DIR = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

converter = MarkItDown()

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

DOWNLOAD_FILE = Path(__file__).parent / "MarkItDown-1.0.0-win-x64.zip"

SUPPORTED_EXTENSIONS = {
    ".pdf", ".docx", ".pptx", ".xlsx", ".xls",
    ".html", ".htm", ".csv", ".json", ".xml",
    ".jpg", ".jpeg", ".png",
    ".wav", ".mp3", ".m4a",
    ".zip", ".epub", ".ipynb", ".msg",
}


@app.get("/")
async def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/download")
async def download():
    if not DOWNLOAD_FILE.exists():
        raise HTTPException(status_code=404, detail="Download not available")
    return FileResponse(
        DOWNLOAD_FILE,
        media_type="application/zip",
        filename=DOWNLOAD_FILE.name,
    )


@app.get("/api/formats")
async def formats():
    return {
        "extensions": sorted(SUPPORTED_EXTENSIONS),
        "categories": {
            "documents": [".pdf", ".docx", ".pptx", ".xlsx", ".xls", ".epub"],
            "web": [".html", ".htm"],
            "data": [".csv", ".json", ".xml", ".ipynb"],
            "media": [".jpg", ".jpeg", ".png", ".wav", ".mp3", ".m4a"],
            "archive": [".zip"],
            "email": [".msg"],
        },
    }


@app.post("/api/convert")
async def convert(file: UploadFile = File(...)):
    filename = file.filename or "unknown"
    ext = Path(filename).suffix.lower()

    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format: {ext}. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 50MB.")

    tmp_dir = tempfile.mkdtemp(prefix="markitdown_")
    tmp_path = Path(tmp_dir) / filename

    try:
        tmp_path.write_bytes(contents)
        result = await asyncio.to_thread(converter.convert, str(tmp_path))

        return {
            "success": True,
            "filename": filename,
            "markdown": result.text_content,
            "title": getattr(result, "title", "") or "",
        }
    except Exception as e:
        error_type = type(e).__name__
        raise HTTPException(status_code=500, detail=f"Conversion failed ({error_type}): {e}")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
