"""
Local FastAPI Server for E-Commerce Photoshop Panel AI Integration
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from services.shadow_service import ShadowService

app = FastAPI(title="E-Commerce AI Photoshop Bridge", version="1.0.0")

# Enable CORS for UXP Panel
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ShadowRequest(BaseModel):
    image: str  # Base64 encoded RGBA PNG
    type: Optional[str] = "contact"
    intensity: Optional[float] = 0.35
    blur: Optional[int] = 20

@app.get("/health")
def health():
    return {"status": "ok", "service": "E-Com AI Bridge", "version": "1.0.0"}

@app.post("/api/ai/shadow")
def create_shadow(req: ShadowRequest):
    try:
        shadow_b64 = ShadowService.generate_ground_shadow(
            image_input=req.image,
            blur_radius=req.blur,
            opacity=req.intensity
        )
        return {"success": True, "result": f"data:image/png;base64,{shadow_b64}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
