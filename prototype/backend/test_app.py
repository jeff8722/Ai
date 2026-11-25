# Run from prototype/backend:  python test_app.py   (no GPU or model weights needed; the model is faked)
import io

from fastapi.testclient import TestClient
from PIL import Image

import app as backend

calls = []


class FakePipeline:
    def __call__(self, **kwargs):
        calls.append(kwargs)
        return type("Output", (), {"images": [kwargs["person_image"]]})()


backend.get_pipeline = lambda: FakePipeline()
client = TestClient(backend.app)


def photo() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (60, 90), "white").save(buffer, "PNG")
    return buffer.getvalue()


def try_on(garment_id, image=None):
    return client.post("/api/try-on", files={"person_image": ("me.png", image or photo())}, data={"garment_id": garment_id})


def test_gallery_and_try_on():
    garments = client.get("/api/garments").json()
    saree = next(g for g in garments if g["kind"] == "sarees")
    shirt = next(g for g in garments if g["kind"] == "tops" and g["department"] == "men")
    assert {g["department"] for g in garments} == {"women", "men", "kids"}
    assert client.get(saree["image"]).status_code == 200

    response = try_on(saree["id"])
    assert response.status_code == 200 and response.headers["content-type"] == "image/png"
    assert (calls[-1]["category"], calls[-1]["garment_photo_type"]) == ("one-pieces", "model")

    assert try_on(shirt["id"]).status_code == 200
    assert (calls[-1]["category"], calls[-1]["garment_photo_type"]) == ("tops", "flat-lay")

    assert try_on("../backend/app.py").status_code == 404
    assert try_on(shirt["id"], image=b"not a photo").status_code == 400


if __name__ == "__main__":
    test_gallery_and_try_on()
    print("ok")
