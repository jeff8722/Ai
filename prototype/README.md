# VESTIQ prototype

Upload a photo, pick a garment, generate. Everything runs on the laptop: React + Vite screen, FastAPI backend,
FASHN VTON v1.5 (open source, Apache-2.0) on the GPU. No API key, no internet after setup.

```
prototype/
  backend/    app.py (FastAPI + model), test_app.py
  frontend/   React + Vite screen
  garments/   <women|men|kids>/<sarees|one-pieces|tops|bottoms>/photo.jpg
```

The model code and weights live in `../fashn-vton-1.5` (already in this repo).

## Setup (once, on the RTX 5060 laptop, Windows PowerShell)

Needs: latest NVIDIA driver, Python 3.12, Node 20+.

```powershell
cd prototype\backend
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip

# 1. PyTorch for RTX 50-series (Blackwell needs the CUDA 12.8 build). Install it FIRST:
#    the default PyTorch from pip on Windows is CPU-only.
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128
python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
#    must print: True NVIDIA GeForce RTX 5060 ...

# 2. The model package and the backend
pip install -e ..\..\fashn-vton-1.5
pip install -r requirements.txt

# 3. Model weights (~2 GB, once; the human parser downloads on first try-on)
python ..\..\fashn-vton-1.5\scripts\download_weights.py --weights-dir ..\..\fashn-vton-1.5\weights
```

```powershell
cd prototype\frontend
npm install
```

## Run (two terminals)

```powershell
# Terminal 1
cd prototype\backend
.venv\Scripts\Activate.ps1
python -m uvicorn app:app --port 8000
```

```powershell
# Terminal 2
cd prototype\frontend
npm run dev
```

Open http://localhost:5173. The first try-on also loads the model, so it is slower than the rest.

**On the Android kiosk:** run `npm run dev -- --host` instead, then open `http://<laptop-ip>:5173` on the kiosk
(same Wi-Fi, allow Node through the Windows firewall). The photo button offers the kiosk camera.

Test photos: `backend/test-images/person.png` and `person2.png` in the main project.

## Adding garments

Drop photos into `garments/<department>/<kind>/`, then reload the page. The file name becomes the label
(`red-silk-saree.jpg` shows as "Red silk saree").

| Folder | Put here | Photo |
|---|---|---|
| `sarees` | sarees, half-sarees | **Draped**, full length, front-on |
| `one-pieces` | frocks, gowns, lehengas, anarkalis, long kurtas, jumpsuits | Product shot on a plain background |
| `tops` | shirts, blouses, t-shirts, short kurtas | Product shot on a plain background |
| `bottoms` | trousers, jeans, skirts, palazzos, dhotis | Product shot on a plain background |

## Sarees: read this

FASHN VTON v1.5 has no saree category. The prototype sends sarees as `one-pieces` and reads the photo as a
garment worn on a body, which is the closest the model gets. Expect mistakes in pleats, pallu, borders and
blouse details, so test with your real saree photos before showing customers.

- A saree worn by a person gives the best result. On a headless dress form (like the starter photo) the
  model may not find a body pose; compare both with the same saree.
- If saree quality is not good enough, the next model to try is Qwen-Image-Edit with a try-on LoRA
  (also Apache-2.0), but it needs a 24 GB+ GPU, so not this laptop.

## Tuning

`VTON_STEPS` (default 30): 20 is faster, 50 is sharper. Set it before starting the backend:
`$env:VTON_STEPS=20`.

## Check

```powershell
cd prototype\backend
python test_app.py   # fakes the model, no GPU needed; prints ok
```
