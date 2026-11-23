"""Capture the composition. stills: python capture.py stills 1.5 6 12 ...   video: python capture.py video [fps] [dur]"""
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
COMP = (HERE.parent / "composition" / "index.html").as_uri()
mode = sys.argv[1]

with sync_playwright() as pw:
    browser = pw.chromium.launch(args=["--force-color-profile=srgb", "--disable-lcd-text"])
    page = browser.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(COMP, wait_until="load")
    page.evaluate("window.ready")
    if mode == "stills":
        out = HERE / "stills"
        out.mkdir(exist_ok=True)
        for t in sys.argv[2:]:
            page.evaluate(f"renderAt({float(t)})")
            page.screenshot(path=str(out / f"t{float(t):05.2f}.png"))
        print("stills ->", out)
    else:
        fps = int(sys.argv[2]) if len(sys.argv) > 2 else 30
        dur = float(sys.argv[3]) if len(sys.argv) > 3 else 62.0
        n = round(fps * dur)
        dest = HERE / "video-silent.mp4"
        ff = subprocess.Popen(
            ["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(fps), "-c:v", "mjpeg", "-i", "-",
             "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-r", str(fps), str(dest)],
            stdin=subprocess.PIPE)
        t0 = time.time()
        for i in range(n):
            page.evaluate(f"renderAt({i / fps})")
            ff.stdin.write(page.screenshot(type="jpeg", quality=93))
            if i % 300 == 0:
                print(f"frame {i}/{n}  {time.time() - t0:.0f}s", flush=True)
        ff.stdin.close()
        ff.wait()
        print("video ->", dest)
    print("page errors:", errors or "none")
    browser.close()
