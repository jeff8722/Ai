"""Quick local try-on check: python try_local.py <person image> [garment image] [category] [steps]

Writes try_local_result.png next to this file and prints the time and peak GPU memory.
"""
import sys
import time
from pathlib import Path

import torch
from PIL import Image

from app.main import WEIGHTS_DIR, GARMENT_PHOTO_TYPE

HERE = Path(__file__).resolve().parent
person_path = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "test-images" / "person.png"
garment_path = Path(sys.argv[2]) if len(sys.argv) > 2 else HERE / "catalog" / "images" / "men-navy-shirt.jpg"
category = sys.argv[3] if len(sys.argv) > 3 else "tops"
steps = int(sys.argv[4]) if len(sys.argv) > 4 else 20

from fashn_vton import TryOnPipeline  # noqa: E402

t0 = time.time()
pipe = TryOnPipeline(weights_dir=str(WEIGHTS_DIR))
print(f"model loaded in {time.time() - t0:.1f}s on {pipe.device} ({pipe.inference_dtype})")

if torch.cuda.is_available():
    torch.cuda.reset_peak_memory_stats()
t1 = time.time()
result = pipe(
    person_image=Image.open(person_path).convert("RGB"),
    garment_image=Image.open(garment_path).convert("RGB"),
    category=category,
    garment_photo_type=GARMENT_PHOTO_TYPE,
    num_samples=1,
    num_timesteps=steps,
    guidance_scale=1.5,
    seed=42,
    segmentation_free=True,
)
out = HERE / "try_local_result.png"
result.images[0].save(out)
peak = torch.cuda.max_memory_allocated() / 2**30 if torch.cuda.is_available() else 0
print(f"try-on took {time.time() - t1:.1f}s, peak GPU memory {peak:.2f} GB -> {out}")
