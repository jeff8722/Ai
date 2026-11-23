# Run: cd backend && python -m pytest test_main.py   (or: python test_main.py)
import os

os.environ["ADMIN_PIN"] = "2468"

from fastapi.testclient import TestClient  # noqa: E402
from app import main  # noqa: E402

client = TestClient(main.app)


def test_category_guess():
    assert main.guess_tryon_category("women", "Frock") == "one-pieces"
    assert main.guess_tryon_category("men", "Chinos") == "bottoms"
    assert main.guess_tryon_category("kids", "Shirts") == "tops"
    assert main.guess_tryon_category("footwear", "Sneakers") is None


def test_sarees():
    assert main.guess_tryon_category("women", "Silk Sarees") == "one-pieces"
    assert main.guess_tryon_category("women", "Kanjivaram sari") == "one-pieces"
    assert main.garment_photo_type_for("Sarees") == "model"
    assert main.garment_photo_type_for("Ethnic", "Banarasi saree") == "model"
    assert main.garment_photo_type_for("Safari jackets") == main.GARMENT_PHOTO_TYPE


def test_staff_pin_guards_catalogue():
    assert client.post("/api/admin/check").status_code == 401
    assert client.post("/api/admin/check", headers={"X-Admin-Pin": "0000"}).status_code == 401
    assert client.post("/api/admin/check", headers={"X-Admin-Pin": "2468"}).json() == {"ok": True}
    assert client.delete("/api/products/NOPE").status_code == 401
    assert client.delete("/api/products/NOPE", headers={"X-Admin-Pin": "2468"}).status_code == 404


def test_health_and_products():
    assert client.get("/api/health").json()["admin_locked"] is True
    assert isinstance(client.get("/api/products").json(), list)


if __name__ == "__main__":
    test_category_guess()
    test_sarees()
    test_staff_pin_guards_catalogue()
    test_health_and_products()
    print("ok")
