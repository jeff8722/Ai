"""VESTIQ prototype backend: lists the photos in ../garments and runs FASHN VTON v1.5 on this machine's GPU.

Run from prototype/backend:  python -m uvicorn app:app --port 8000
"""
import io
import logging
import os
import threading
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageOps, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

HERE = Path(__file__).resolve().parent
GARMENTS = HERE.parent / "garments"
WEIGHTS = Path(os.getenv("FASHN_VTON_WEIGHTS_DIR") or HERE.parents[1] / "fashn-vton-1.5" / "weights")
STEPS = int(os.getenv("VTON_STEPS", "30"))  # model's guidance: 20 fast, 30 balanced, 50 best
MAX_UPLOAD = 20 * 1024 * 1024

# garments/<department>/<kind>/<photo>. The kind folder decides what the model is told the garment is.
DEPARTMENTS = ("women", "men", "kids")
KINDS = {"sarees": "one-pieces", "one-pieces": "one-pieces", "tops": "tops", "bottoms": "bottoms"}
PHOTO_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")

log = logging.getLogger("vestiq")
app = FastAPI(title="VESTIQ prototype")
app.mount("/garments", StaticFiles(directory=GARMENTS), name="garments")
_pipeline = None
_gpu = threading.Lock()


def list_garments() -> list[dict]:
    items = []
    for path in sorted(GARMENTS.glob("*/*/*")):
        department, kind = path.parent.parent.name, path.parent.name
        if department in DEPARTMENTS and kind in KINDS and path.suffix.lower() in PHOTO_EXTENSIONS:
            garment_id = f"{department}/{kind}/{path.name}"
            name = path.stem.replace("-", " ").replace("_", " ")
            items.append({
                "id": garment_id,
                "department": department,
                "kind": kind,
                "name": name[:1].upper() + name[1:],
                "image": "/garments/" + quote(garment_id),
            })
    return items


def get_pipeline():
    global _pipeline
    if _pipeline is None:
        if not (WEIGHTS / "model.safetensors").is_file():
            raise RuntimeError(f"Model weights not found in {WEIGHTS}. See prototype/README.md, step 3.")
        from fashn_vton import TryOnPipeline

        _pipeline = TryOnPipeline(weights_dir=str(WEIGHTS))
    return _pipeline


def run_tryon(person: Image.Image, garment_path: Path, kind: str) -> bytes:
    garment = Image.open(garment_path).convert("RGB")
    # A saree only has a shape once it is draped, so its photo must show it worn (person or mannequin).
    # ponytail: every other garment is read as a flat product shot; add a per-photo override if staff shoot on models.
    photo_type = "model" if kind == "sarees" else "flat-lay"
    with _gpu:  # one generation at a time: an 8 GB GPU cannot hold two
        result = get_pipeline()(
            person_image=person,
            garment_image=garment,
            category=KINDS[kind],
            garment_photo_type=photo_type,
            num_timesteps=STEPS,
            seed=42,
        )
    out = io.BytesIO()
    result.images[0].save(out, "PNG")
    return out.getvalue()


@app.get("/api/garments")
def garments():
    return list_garments()


@app.post("/api/try-on")
async def try_on(person_image: UploadFile = File(...), garment_id: str = Form(...)):
    # Look the id up in the gallery rather than joining it to a path, so nothing outside garments/ is reachable.
    garment = next((g for g in list_garments() if g["id"] == garment_id), None)
    if garment is None:
        raise HTTPException(404, "That garment is no longer in the gallery.")
    raw = await person_image.read()
    if not raw or len(raw) > MAX_UPLOAD:
        raise HTTPException(413, "Use a photo smaller than 20 MB.")
    try:
        # Phone and kiosk cameras store rotation in EXIF; without this the person arrives sideways.
        person = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert("RGB")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(400, "That file is not a photo. Use JPG, PNG or WEBP.")
    try:
        png = await run_in_threadpool(run_tryon, person, GARMENTS / garment_id, garment["kind"])
    except Exception as exc:
        log.exception("try-on failed")
        raise HTTPException(500, f"Try-on failed: {exc}")
    return Response(png, media_type="image/png", headers={"Cache-Control": "no-store"})
