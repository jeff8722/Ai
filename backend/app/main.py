from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool
import importlib.util
import io
import os
import re
import secrets
import sqlite3
import threading
import uuid
from dotenv import load_dotenv

# Project paths
BASE = Path(__file__).resolve().parents[1]
load_dotenv(BASE / ".env")

# SQLite catalogue database and product image directory
DB_PATH = BASE / "catalogue.db"
IMAGE_DIR = BASE / "catalog" / "images"
IMAGE_DIR.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD = 20 * 1024 * 1024

# The model repository lives either inside this project (Ai/fashn-vton-1.5)
# or beside it (../fashn-vton-1.5). Use whichever has weights; default to the inside one.
_WEIGHT_CANDIDATES = [
    BASE.parent / "fashn-vton-1.5" / "weights",
    BASE.parent.parent / "fashn-vton-1.5" / "weights",
]
DEFAULT_MODEL_WEIGHTS = next(
    (p for p in _WEIGHT_CANDIDATES if (p / "model.safetensors").is_file()),
    _WEIGHT_CANDIDATES[0],
)
WEIGHTS_DIR = Path(os.getenv("FASHN_VTON_WEIGHTS_DIR") or str(DEFAULT_MODEL_WEIGHTS)).expanduser()
MODEL_CATEGORY = os.getenv("LOCAL_VTON_CATEGORY", "one-pieces")
GARMENT_PHOTO_TYPE = os.getenv("LOCAL_VTON_GARMENT_PHOTO_TYPE", "flat-lay")
NUM_TIMESTEPS = int(os.getenv("LOCAL_VTON_STEPS", "20"))
# 1.5 = the model's default. 1.0 = guidance off: each step runs once instead of twice, about 2x faster.
GUIDANCE = float(os.getenv("LOCAL_VTON_GUIDANCE", "1.5"))
# Staff PIN for catalogue changes. Empty = catalogue admin stays open (old behaviour).
ADMIN_PIN = os.getenv("ADMIN_PIN", "").strip()

BOTTOM_WORDS = ("pant", "trouser", "jean", "bottom", "skirt", "short", "legging", "palazzo", "jogger", "chino", "cargo", "dhoti")
ONE_PIECE_WORDS = ("dress", "gown", "saree", "lehenga", "kurta", "one-piece", "frock", "jumpsuit", "romper", "anarkali", "dungaree")
# Same rule as isSaree in src/size.js: "Sarees", "Kanjivaram sari", "Half-saree"; not "safari" or "sarong".
SAREE = re.compile(r"\bsar(ee|i)s?\b", re.IGNORECASE)

app = FastAPI(title="VESTIQ Product & Virtual Try-On API", version="0.5.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        x.strip()
        for x in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if x.strip()
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)
app.mount("/media", StaticFiles(directory=str(IMAGE_DIR)), name="media")

_pipeline = None
_pipeline_lock = threading.Lock()
_inference_lock = threading.Lock()


def get_db():
    """Open the VESTIQ SQLite database and return rows as dictionaries."""
    if not DB_PATH.is_file():
        raise HTTPException(
            status_code=503,
            detail=f"Catalogue database not found at {DB_PATH}. Copy catalogue.db into the backend folder."
        )
    connection = sqlite3.connect(str(DB_PATH), timeout=10)
    connection.row_factory = sqlite3.Row
    return connection


def product_rows_to_dicts(rows):
    return [dict(row) for row in rows]


def require_staff(pin: str | None):
    """Catalogue changes need the staff PIN when ADMIN_PIN is set."""
    if ADMIN_PIN and not secrets.compare_digest((pin or "").strip(), ADMIN_PIN):
        raise HTTPException(status_code=401, detail="Staff PIN is incorrect.")


def guess_tryon_category(department: str, category: str) -> str | None:
    if department == "footwear":
        return None
    if SAREE.search(category):
        return "one-pieces"
    category_lower = category.lower()
    if any(word in category_lower for word in BOTTOM_WORDS):
        return "bottoms"
    if any(word in category_lower for word in ONE_PIECE_WORDS):
        return "one-pieces"
    return "tops"


def garment_photo_type_for(category: str, name: str = "") -> str:
    """A saree only has a shape once it is draped, so saree photos are read as worn by a model or mannequin."""
    return "model" if SAREE.search(f"{category} {name}") else GARMENT_PHOTO_TYPE


def model_status():
    if importlib.util.find_spec("fashn_vton") is None:
        return "local-ai-setup-required", "FASHN VTON is not installed in this Python environment. Follow the local AI installation steps."
    required = [
        WEIGHTS_DIR / "model.safetensors",
        WEIGHTS_DIR / "dwpose" / "yolox_l.onnx",
        WEIGHTS_DIR / "dwpose" / "dw-ll_ucoco_384.onnx",
    ]
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        return "local-ai-setup-required", "Local model weights are missing. Run the model weight download command; missing: " + ", ".join(missing)
    return "local-ai-ready", "Local FASHN VTON v1.5 is installed and its required weights are present."


def get_pipeline():
    global _pipeline
    if _pipeline is None:
        with _pipeline_lock:
            if _pipeline is None:
                try:
                    from fashn_vton import TryOnPipeline
                except ImportError as exc:
                    raise RuntimeError(
                        "FASHN VTON is not installed. Install the local model into this backend's .venv."
                    ) from exc
                _pipeline = TryOnPipeline(
                    weights_dir=str(WEIGHTS_DIR),
                    device=os.getenv("LOCAL_VTON_DEVICE") or None,
                )
                if GUIDANCE <= 1.0:
                    model = _pipeline.tryon_model

                    # The pipeline always runs a guided and an unguided pass; with guidance off the unguided one
                    # is thrown away, so run only the guided pass (no mask = conditioned) and use it for both.
                    def single_pass(*args, **kwargs):
                        v = model.forward(*args, **{k: val for k, val in kwargs.items() if val is not None})["x"]
                        return {"v_c": v, "v_u": v}

                    model.forward_for_cfg = single_pass
    return _pipeline


def generate_local_tryon(
    person_bytes: bytes,
    garment_bytes: bytes,
    category: str | None = None,
    steps: int = NUM_TIMESTEPS,
    seed: int = 42,
    photo_type: str | None = None,
) -> bytes:
    # Product records store FASHN's category: tops, bottoms, or one-pieces.
    selected_category = category or MODEL_CATEGORY
    if selected_category not in {"tops", "bottoms", "one-pieces"}:
        raise ValueError("Try-on category must be tops, bottoms, or one-pieces.")
    photo_type = photo_type or GARMENT_PHOTO_TYPE
    if photo_type not in {"model", "flat-lay"}:
        raise RuntimeError("LOCAL_VTON_GARMENT_PHOTO_TYPE must be model or flat-lay.")

    try:
        person = Image.open(io.BytesIO(person_bytes)).convert("RGB")
        garment = Image.open(io.BytesIO(garment_bytes)).convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ValueError(
            "Could not read one of the uploaded images. Please use a JPG, PNG or WEBP image."
        ) from exc

    # Serialise inference: one 8 GB GPU should not run multiple generations concurrently.
    with _inference_lock:
        pipeline = get_pipeline()
        result = pipeline(
            person_image=person,
            garment_image=garment,
            category=selected_category,
            garment_photo_type=photo_type,
            num_samples=1,
            num_timesteps=steps,
            guidance_scale=GUIDANCE,
            seed=seed,
            segmentation_free=True,
        )
        if not result.images:
            raise RuntimeError("The local model did not return an output image.")
        output = io.BytesIO()
        result.images[0].save(output, format="PNG")
        return output.getvalue()


@app.get("/api/health")
def health():
    mode, message = model_status()
    return {
        "status": "ok",
        "mode": mode,
        "provider": "FASHN VTON v1.5 (local)" if mode == "local-ai-ready" else None,
        "message": message,
        "weights_dir": str(WEIGHTS_DIR),
        "default_category": MODEL_CATEGORY,
        "garment_photo_type": GARMENT_PHOTO_TYPE,
        "steps": NUM_TIMESTEPS,
        "catalogue_database": str(DB_PATH),
        "catalogue_database_exists": DB_PATH.is_file(),
        "admin_locked": bool(ADMIN_PIN),
    }


@app.post("/api/admin/check")
def admin_check(x_admin_pin: str | None = Header(None)):
    """Lets the staff screen verify a PIN before showing catalogue tools."""
    require_staff(x_admin_pin)
    return {"ok": True}


@app.get("/api/products")
def get_products(department: str | None = None, category: str | None = None):
    """Return all active products, optionally filtered by department/category."""
    connection = get_db()
    try:
        query = "SELECT * FROM products WHERE active = 1"
        params = []

        if department:
            query += " AND LOWER(department) = LOWER(?)"
            params.append(department.strip())

        if category:
            query += " AND LOWER(category) = LOWER(?)"
            params.append(category.strip())

        query += " ORDER BY department, category, name"
        rows = connection.execute(query, params).fetchall()
        return product_rows_to_dicts(rows)
    finally:
        connection.close()


@app.get("/api/products/{product_id}")
def get_product(product_id: str):
    connection = get_db()
    try:
        row = connection.execute(
            "SELECT * FROM products WHERE id = ? AND active = 1",
            (product_id,),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Product not found.")
        return dict(row)
    finally:
        connection.close()


@app.get("/api/categories")
def get_categories(department: str | None = None):
    """Return categories available in the active product catalogue."""
    connection = get_db()
    try:
        query = """
            SELECT DISTINCT category
            FROM products
            WHERE active = 1
        """
        params = []
        if department:
            query += " AND LOWER(department) = LOWER(?)"
            params.append(department.strip())
        query += " ORDER BY category"
        rows = connection.execute(query, params).fetchall()
        return [{"name": row["category"]} for row in rows]
    finally:
        connection.close()


# Compatibility route: the previous frontend may still request /api/sarees.
# It now reads from SQLite instead of the deleted sarees.json file.
@app.get("/api/sarees")
def sarees():
    connection = get_db()
    try:
        rows = connection.execute(
            "SELECT * FROM products WHERE active = 1 ORDER BY department, category, name"
        ).fetchall()
        return product_rows_to_dicts(rows)
    finally:
        connection.close()


# Compatibility route for the old add-saree form, plus the new general product route.
@app.post("/api/sarees")
@app.post("/api/products")
async def add_product(
    name: str = Form(...),
    category: str = Form(...),
    color: str = Form(...),
    price: float = Form(...),
    description: str = Form(""),
    image: UploadFile = File(...),
    department: str = Form("women"),
    tryon_category: str | None = Form(None),
    x_admin_pin: str | None = Header(None),
):
    require_staff(x_admin_pin)
    name = name.strip()
    category = category.strip()
    color = color.strip()
    department = department.strip().lower()

    if not name or not category or not color:
        raise HTTPException(
            status_code=400,
            detail="Name, category and colour are required.",
        )
    if department not in {"men", "women", "kids", "footwear"}:
        raise HTTPException(
            status_code=400,
            detail="Department must be men, women, kids or footwear.",
        )
    if price < 0 or price > 10_000_000:
        raise HTTPException(status_code=400, detail="Enter a valid product price.")

    # Determine FASHN category from the product category when not explicitly supplied.
    if tryon_category is None or not tryon_category.strip():
        selected_tryon_category = guess_tryon_category(department, category)
    else:
        selected_tryon_category = tryon_category.strip().lower()
        if selected_tryon_category not in {"tops", "bottoms", "one-pieces"}:
            raise HTTPException(
                status_code=400,
                detail="Try-on category must be tops, bottoms or one-pieces.",
            )

    raw = await image.read()
    if not raw or len(raw) > MAX_UPLOAD:
        raise HTTPException(status_code=413, detail="Choose an image smaller than 20 MB.")

    try:
        with Image.open(io.BytesIO(raw)) as uploaded_image:
            uploaded_image.verify()
        with Image.open(io.BytesIO(raw)) as uploaded_image:
            product_image = uploaded_image.convert("RGB")
            product_image.thumbnail((2400, 3600))
            filename = f"{uuid.uuid4().hex}.jpg"
            product_image.save(
                IMAGE_DIR / filename,
                "JPEG",
                quality=92,
                optimize=True,
            )
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="That file is not a supported image. Upload JPG, PNG or WEBP.",
        )

    product_id = "VS" + uuid.uuid4().hex[:8].upper()
    image_path = f"/media/{filename}"
    connection = get_db()
    try:
        connection.execute(
            """
            INSERT INTO products
                (id, name, department, category, color, price, image,
                 description, tryon_category, active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            """,
            (
                product_id,
                name,
                department,
                category,
                color,
                round(price, 2),
                image_path,
                description.strip(),
                selected_tryon_category,
            ),
        )
        connection.commit()
        row = connection.execute(
            "SELECT * FROM products WHERE id = ?",
            (product_id,),
        ).fetchone()
        return dict(row)
    except sqlite3.IntegrityError as exc:
        # Remove the just-saved image if the database insert fails.
        (IMAGE_DIR / filename).unlink(missing_ok=True)
        raise HTTPException(status_code=409, detail="Could not add this product; check its product ID and fields.") from exc
    finally:
        connection.close()


@app.delete("/api/products/{product_id}")
def archive_product(product_id: str, x_admin_pin: str | None = Header(None)):
    """Hide a product from the catalogue. The row and image stay, so it can be restored in SQLite."""
    require_staff(x_admin_pin)
    connection = get_db()
    try:
        changed = connection.execute(
            "UPDATE products SET active = 0 WHERE id = ? AND active = 1", (product_id,)
        ).rowcount
        connection.commit()
        if not changed:
            raise HTTPException(status_code=404, detail="Product not found.")
        return {"id": product_id, "active": 0}
    finally:
        connection.close()


def product_image_bytes(product_id: str) -> tuple[bytes, str | None, str]:
    """Read a catalogue garment straight from disk, so the browser doesn't download and re-upload it."""
    connection = get_db()
    try:
        row = connection.execute(
            "SELECT image, tryon_category, category, name FROM products WHERE id = ? AND active = 1", (product_id,)
        ).fetchone()
    finally:
        connection.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Product not found.")
    path = (IMAGE_DIR / Path(row["image"]).name).resolve()
    if path.parent != IMAGE_DIR.resolve() or not path.is_file():
        raise HTTPException(status_code=404, detail="Product image is missing on the server.")
    return path.read_bytes(), row["tryon_category"], garment_photo_type_for(row["category"], row["name"])


@app.post("/api/try-on")
async def try_on(
    person_image: UploadFile = File(...),
    garment_image: UploadFile | None = File(None),
    category: str | None = Form(None),
    product_id: str | None = Form(None),
    steps: int | None = Form(None),
    seed: int | None = Form(None),
):
    person = await person_image.read()
    photo_type = None
    if product_id:
        garment, product_category, photo_type = product_image_bytes(product_id.strip())
        category = category or product_category
    else:
        garment = await garment_image.read() if garment_image else b""
    # ponytail: 8-40 covers "quick" to "detailed"; outside that the model is either mush or too slow on a laptop GPU.
    steps = min(40, max(8, steps or NUM_TIMESTEPS))
    seed = 42 if seed is None else seed % 2**31

    if not person or not garment:
        raise HTTPException(
            status_code=400,
            detail="Both customer and garment images are required.",
        )
    if len(person) > MAX_UPLOAD or len(garment) > MAX_UPLOAD:
        raise HTTPException(
            status_code=413,
            detail="Each image must be smaller than 20 MB.",
        )

    mode, message = model_status()
    if mode != "local-ai-ready":
        raise HTTPException(status_code=503, detail=message)

    try:
        output = await run_in_threadpool(
            generate_local_tryon,
            person,
            garment,
            category,
            steps,
            seed,
            photo_type,
        )
        return Response(
            output,
            media_type="image/png",
            headers={
                "X-TryOn-Mode": "local-ai",
                "Cache-Control": "no-store",
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Local model weights are unavailable: {exc}",
        )
    except RuntimeError as exc:
        message = str(exc)
        if "out of memory" in message.lower() or "cuda" in message.lower():
            raise HTTPException(
                status_code=503,
                detail=(
                    "The local AI could not run on the current GPU memory. "
                    "Close GPU-heavy apps and try again; if it persists, we will tune the model or test CPU mode."
                ),
            )
        raise HTTPException(status_code=500, detail=f"Local AI error: {message}")
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Local AI generation failed ({exc.__class__.__name__}). Check the backend terminal for details.",
        )
