import pytest
from rest_framework.test import APIClient

from properties.models import Property

URL = "/api/properties/"


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def sample():
    return Property.objects.create(
        name="Torre Andares", city="Guadalajara", size_m2=500, monthly_rent="85000.00"
    )


@pytest.mark.django_db
def test_list_properties(client, sample):
    res = client.get(URL)
    assert res.status_code == 200
    assert res.data["count"] == 1
    assert res.data["results"][0]["name"] == "Torre Andares"


@pytest.mark.django_db
def test_create_property(client):
    payload = {"name": "Oficina Centro", "city": "CDMX", "size_m2": 120, "monthly_rent": "30000.00"}
    res = client.post(URL, payload, format="json")
    assert res.status_code == 201
    assert Property.objects.count() == 1
    assert res.data["status"] == "available"


@pytest.mark.django_db
def test_create_invalid_size_returns_400(client):
    payload = {"name": "Bad", "city": "CDMX", "size_m2": 0, "monthly_rent": "100.00"}
    res = client.post(URL, payload, format="json")
    assert res.status_code == 400
    assert "size_m2" in res.data


@pytest.mark.django_db
def test_filter_by_city(client, sample):
    Property.objects.create(name="Bodega", city="Monterrey", size_m2=900, monthly_rent="40000")
    res = client.get(URL, {"city": "Monterrey"})
    assert res.data["count"] == 1
    assert res.data["results"][0]["city"] == "Monterrey"


@pytest.mark.django_db
def test_update_status(client, sample):
    res = client.patch(f"{URL}{sample.id}/", {"status": "leased"}, format="json")
    assert res.status_code == 200
    sample.refresh_from_db()
    assert sample.status == "leased"


@pytest.mark.django_db
def test_delete_property(client, sample):
    res = client.delete(f"{URL}{sample.id}/")
    assert res.status_code == 204
    assert Property.objects.count() == 0
