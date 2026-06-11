import logging
from fastapi import FastAPI, HTTPException, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel, Field

from analyzer import run_full_analysis
from analyzer.report import generate_pdf_report

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("emailtracer.api")

app = FastAPI(title="EmailTracer API", version="2.0.0")

class AnalyzeRequest(BaseModel):
    headers: str = Field(..., min_length=10, description="Raw email headers")
    expected_domain: str = Field("", description="Expected sender domain for lookalike check")
    abuseipdb_key: str = Field("", description="Optional AbuseIPDB API Key")

@app.get("/", response_class=HTMLResponse)
async def serve_index():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()

@app.post("/analyze")
async def analyze_headers(req: AnalyzeRequest):
    if not req.headers.strip():
        raise HTTPException(status_code=400, detail="Headers cannot be empty")
    
    try:
        result = run_full_analysis(
            raw_headers=req.headers,
            expected_domain=req.expected_domain.strip(),
            abuseipdb_key=req.abuseipdb_key.strip()
        )
        return result
    except Exception as exc:
        logger.exception("Analysis failed in API endpoint")
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/export/pdf")
async def export_pdf(req: dict = Body(...)):
    try:
        # Generate full analysis again or accept JSON from client
        # It's better to accept the raw headers and re-analyze to ensure integrity,
        # but for performance if the client sends the analysis JSON, we can use it.
        # Let's accept the analysis JSON from the frontend.
        pdf_bytes = generate_pdf_report(req)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": 'attachment; filename="EmailTracer_Report.pdf"'
            }
        )
    except Exception as exc:
        logger.exception("PDF generation failed")
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {exc}")

app.mount("/static", StaticFiles(directory="static"), name="static")
