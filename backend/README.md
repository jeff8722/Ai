# VESTIQ: local AI virtual fitting room

Touch-first retail kiosk prototype: React + Vite frontend, FastAPI backend, and local FASHN VTON v1.5 inference. The backend no longer calls the paid FASHN API and does not require an API key or API credits.

## Important saree limitation

FASHN VTON v1.5 currently accepts only `tops`, `bottoms`, and `one-pieces`; it has no dedicated saree category. This project defaults to `one-pieces` and `flat-lay` because the catalogue is expected to contain product photographs. This is an experiment, not a validated saree draping solution. Pleats, pallu placement, blouse details, borders, and fabric patterns may be inaccurate. Test with real saree photos before using it with customers.

## Folder layout

```
Ai/
  src/              React + Vite app (run npm commands here)
  backend/          FastAPI server, catalogue.db, catalog/images
  fashn-vton-1.5/   local model; weights go in fashn-vton-1.5/weights
```

The backend finds `fashn-vton-1.5/weights` inside this folder or one level up; set `FASHN_VTON_WEIGHTS_DIR` to override.

## Install local AI on Windows

Use Python 3.11. The existing backend virtual environment can be used, but keep the AI model source in its own sibling folder. Open a new PowerShell terminal:

```powershell
cd "E:\fitting 2"
git clone https://github.com/fashn-AI/fashn-vton-1.5.git
```

Activate the existing backend environment (adjust the path if your project is elsewhere):

```powershell
cd "E:\fitting 2\saree-mirror\backend"
.venv\Scripts\Activate.ps1
```

Install the model into that same backend environment:

```powershell
python -m pip install --upgrade pip
pip install -e "..\..\fashn-vton-1.5"
```

The upstream project declares PyTorch, torchvision, ONNX Runtime GPU, the human parser and other dependencies. On Windows, GPU inference depends on compatible NVIDIA driver, PyTorch CUDA wheel, ONNX Runtime GPU, and CUDA/cuDNN runtime libraries. Verify `nvidia-smi` and `torch.cuda.is_available()` before trying inference. If the upstream dependency installation fails or installs CPU-only PyTorch, stop and follow the current official PyTorch Windows/CUDA installation selector rather than randomly changing CUDA packages.

Download the model weights from the model repository:

```powershell
cd "E:\fitting 2\fashn-vton-1.5"
python scripts\download_weights.py --weights-dir .\weights
```

Required files include `weights\model.safetensors`, `weights\dwpose\yolox_l.onnx`, and `weights\dwpose\dw-ll_ucoco_384.onnx`. The human-parser weights are downloaded to the Hugging Face cache on first use.

## Configure backend

Copy `backend\.env.example` to `backend\.env`. The defaults assume the model repo is beside `saree-mirror`, so you can leave `FASHN_VTON_WEIGHTS_DIR` blank. Example:

```env
FASHN_VTON_WEIGHTS_DIR=
LOCAL_VTON_DEVICE=
LOCAL_VTON_CATEGORY=one-pieces
LOCAL_VTON_GARMENT_PHOTO_TYPE=flat-lay
LOCAL_VTON_STEPS=20
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ADMIN_PIN=
```

Set `ADMIN_PIN` (for example `ADMIN_PIN=2468`) to lock the Staff screen. Adding and removing products then needs that PIN. Left blank, the Staff screen stays open.

No `FASHN_API_KEY` is used. The backend loads the model only on the first try-on request and reuses it for later requests. Requests are serialised to avoid multiple simultaneous generations competing for the laptop GPU.

## Start the backend

```powershell
cd "E:\fitting 2\saree-mirror\backend"
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Check `http://127.0.0.1:8000/api/health`. It should report `local-ai-ready` after package and weights are present.

## Start the frontend

Open a second terminal:

```powershell
cd "<project folder>\Ai"
npm install
npm run dev
```

The project's `.npmrc` points npm at the public registry, so a private registry set in your user `.npmrc` doesn't block installs.

Open `http://localhost:5173`. Existing camera capture, catalogue selection and admin uploads are retained. The frontend receives the generated PNG from the local backend.

## Catalogue images

Use clear, well-lit photographs. For this model, use one garment per image. A saree laid out fully against a plain background is the configured input style (`flat-lay`), but the model was not trained with a saree category. Avoid folded bundles and cropped product images.

## GPU and performance notes

The model repository recommends a dedicated GPU and automatically selects CUDA when available. Its documentation describes bfloat16 on supported Ampere-or-newer GPUs. An 8 GB laptop GPU is near the expected memory boundary; close games, browsers using GPU acceleration, and other GPU workloads before testing. The first request loads the model and may take longer than subsequent requests. If CUDA out-of-memory occurs, we will tune the environment or test CPU mode; CPU inference may be very slow.

## Admin security

The Staff screen is protected only by `ADMIN_PIN` (sent as a header over plain HTTP). Keep the app on a trusted network, and add HTTPS and proper staff accounts before wider use.

## Checks

`cd backend && python test_main.py` checks the category guesser and the staff PIN guard.

## Licensing

The main FASHN VTON v1.5 repository is Apache-2.0. Its README identifies third-party components including FASHN Human Parser with separate licence terms; review all component licences before commercial deployment.
