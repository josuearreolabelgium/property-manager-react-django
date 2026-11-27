import re

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from rest_framework.test import APIClient

from properties.models import Property

URL = "/api/properties/"
HEADER = "nombre,tipo,operacion,direccion,ciudad,codigo_postal,superficie_min_m2,superficie_max_m2,precio\n"


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def sample():
    return Property.objects.create(
        name="Torre Andares", city="Guadalajara", size_m2=500, monthly_rent="85000.00"
    )


@pytest.fixture
def import_csv(tmp_path):
    """Writes the given rows (after the header) to a CSV file and imports it."""
    def run(*rows):
        csv_file = tmp_path / "edificios.csv"
        csv_file.write_text(HEADER + "".join(r + "\n" for r in rows), encoding="utf-8")
        call_command("import_properties", str(csv_file))
    return run


# ---------- API ----------

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
    # Fields left out get their defaults
    assert (res.data["status"], res.data["property_type"], res.data["operation"]) == ("available", "office", "rent")
    assert res.data["rent_currency"] == "MXN"


@pytest.mark.django_db
def test_create_with_building_details_and_price_on_request(client):
    payload = {
        "name": "Torre Reforma Latino", "property_type": "office", "operation": "rent",
        "address": "Av. Paseo de la Reforma 296, Col. Juárez", "city": "Ciudad de México",
        "postal_code": "06600", "size_m2": 250, "size_max_m2": 2102, "monthly_rent": None, "rent_currency": "USD",
    }
    res = client.post(URL, payload, format="json")
    assert res.status_code == 201
    assert res.data["postal_code"] == "06600"  # leading zero kept
    assert (res.data["monthly_rent"], res.data["rent_currency"]) == (None, "USD")


@pytest.mark.django_db
@pytest.mark.parametrize("change,field", [
    ({"size_m2": 0}, "size_m2"),
    ({"size_max_m2": 100}, "size_max_m2"),       # smaller than size_m2 (500)
    ({"name": "Torre Andares"}, "name"),         # already used by the sample property
    ({"property_type": "castle"}, "property_type"),
    ({"rent_currency": "GBP"}, "rent_currency"),
])
def test_create_invalid_returns_400(client, sample, change, field):
    payload = {"name": "Nueva", "city": "CDMX", "size_m2": 500, **change}
    res = client.post(URL, payload, format="json")
    assert res.status_code == 400
    assert field in res.data
    assert Property.objects.count() == 1  # only the sample


@pytest.mark.django_db
def test_full_update_is_not_allowed(client, sample):
    res = client.put(f"{URL}{sample.id}/", {"name": "X", "city": "Y", "size_m2": 1}, format="json")
    assert res.status_code == 405


@pytest.mark.django_db
def test_patch_invalid_size_returns_400(client, sample):
    res = client.patch(f"{URL}{sample.id}/", {"size_m2": 0}, format="json")
    assert res.status_code == 400
    assert "size_m2" in res.data


@pytest.mark.django_db
def test_patch_min_size_above_saved_max_reports_the_sent_field(client, sample):
    sample.size_max_m2 = 800
    sample.save()
    res = client.patch(f"{URL}{sample.id}/", {"size_m2": 900}, format="json")
    assert res.status_code == 400
    assert list(res.data) == ["size_m2"]  # the field the client sent, not size_max_m2


@pytest.mark.django_db
def test_patch_max_size_smaller_than_min_returns_400(client, sample):
    res = client.patch(f"{URL}{sample.id}/", {"size_max_m2": 100}, format="json")  # saved min is 500
    assert res.status_code == 400
    assert "size_max_m2" in res.data


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


@pytest.mark.django_db
def test_list_cities(client, sample):
    Property.objects.create(name="Bodega", city="Monterrey", size_m2=900, monthly_rent="40000")
    Property.objects.create(name="Otra", city="Guadalajara", size_m2=100, monthly_rent="1000")
    res = client.get(f"{URL}cities/")
    assert res.status_code == 200
    assert res.data == ["Guadalajara", "Monterrey"]


@pytest.mark.django_db
def test_search_by_name_or_city(client, sample):
    Property.objects.create(name="Bodega", city="Monterrey", size_m2=900, monthly_rent="40000")
    res = client.get(URL, {"search": "torre"})  # partial, case-insensitive name match
    assert [p["name"] for p in res.data["results"]] == ["Torre Andares"]
    res = client.get(URL, {"search": "monter"})  # also matches city
    assert [p["name"] for p in res.data["results"]] == ["Bodega"]


@pytest.mark.django_db
def test_search_by_postal_code(client, sample):
    Property.objects.create(name="Magdalena 211", city="Ciudad de México", postal_code="03103", size_m2=280)
    res = client.get(URL, {"search": "03103"})
    assert [p["name"] for p in res.data["results"]] == ["Magdalena 211"]


@pytest.mark.django_db
def test_ordering_by_size(client, sample):
    Property.objects.create(name="Grande", city="CDMX", size_m2=9000)
    Property.objects.create(name="Chica", city="CDMX", size_m2=50)
    res = client.get(URL, {"ordering": "-size_m2"})
    assert [p["name"] for p in res.data["results"]] == ["Grande", "Torre Andares", "Chica"]


@pytest.mark.django_db
def test_ordering_ties_are_stable_across_pages(client):
    # 15 buildings with the same size: pages 1 and 2 together must contain each exactly once
    for i in range(15):
        Property.objects.create(name=f"Edificio {i}", city="CDMX", size_m2=250)
    page1 = client.get(URL, {"ordering": "size_m2", "page": 1}).data["results"]
    page2 = client.get(URL, {"ordering": "size_m2", "page": 2}).data["results"]
    ids = [p["id"] for p in page1 + page2]
    assert ids == sorted(Property.objects.values_list("id", flat=True))


# ---------- CSV import ----------

@pytest.mark.django_db
def test_import_csv(import_csv):
    rows = [
        '"JAIME NUNÓ",Oficina,Renta,"Av. Insurgentes Sur 1921","Ciudad de México",01020,475,33277,"A consultar (USD)"',
        '"LA PERLA",Oficina,Renta,"Amado Nervo 2200","Zapopan, Jalisco",45050,3112,3112,"$150,000 MXN"',
        '"ARCOS",Oficina,Venta/Renta,"Paseo de los Tamarindos 400A","Ciudad de México",05120,301.5,3214,"A consultar (USD)"',
    ]
    import_csv(*rows)
    import_csv(*rows)  # second run updates, does not duplicate

    assert Property.objects.count() == 3
    nuno = Property.objects.get(name="JAIME NUNÓ")
    assert (nuno.postal_code, nuno.size_m2, nuno.size_max_m2) == ("01020", 475, 33277)
    assert (nuno.monthly_rent, nuno.rent_currency, nuno.property_type) == (None, "USD", "office")
    perla = Property.objects.get(name="LA PERLA")
    assert perla.size_max_m2 is None  # 3112-3112 is a single size
    assert (str(perla.monthly_rent), perla.rent_currency) == ("150000.00", "MXN")
    arcos = Property.objects.get(name="ARCOS")
    assert (arcos.operation, arcos.size_m2) == ("rent", 302)  # Venta/Renta can be leased; 301.5 is rounded


@pytest.mark.django_db
@pytest.mark.parametrize("size_min,size_max,price,message", [
    ("1,200", "2000", "A consultar (USD)", "size '1,200' is not a number"),
    ("", "2000", "A consultar (USD)", "size '' is not a number"),
    ("0", "", "A consultar (USD)", "size_m2"),               # same rule as the API: size > 0
    ("500", "100", "A consultar (USD)", "size_max_m2"),       # max smaller than min
    ("100", "200", "$25 USD/m2", "price '$25 USD/m2'"),       # price per m², not a monthly price
    ("100", "200", "$85,000 MXN + IVA 16%", "price"),
    ("100", "200", "$100-$200 USD", "price"),
    ("100", "200", "1,50 USD", "price '1,50 USD'"),          # decimal comma, not thousands
    ("100", "200", "$1,2,3", "price"),
    ("100", "200", "$1,,000", "price"),
    ("NaN", "200", "A consultar (USD)", "size 'NaN' is not a number"),
    ("100", "Infinity", "A consultar (USD)", "size 'Infinity' is not a number"),
])
def test_import_rejects_bad_rows_and_saves_nothing(import_csv, size_min, size_max, price, message):
    good = '"OK",Oficina,Renta,"Calle 1","CDMX",01000,100,200,"A consultar (USD)"'
    bad = f'"BAD",Oficina,Renta,"Calle 2","CDMX",01000,"{size_min}","{size_max}","{price}"'
    with pytest.raises(CommandError, match=r"Line 3 \('BAD'\).*" + re.escape(message)):
        import_csv(good, bad)
    assert Property.objects.count() == 0  # the whole file is rolled back


@pytest.mark.django_db
def test_seed_keeps_imported_properties(import_csv):
    import_csv('"JAIME NUNÓ",Oficina,Renta,"Av. Insurgentes Sur 1921","Ciudad de México",01020,475,33277,"A consultar (USD)"')
    call_command("seed")
    call_command("seed")  # running it again does not duplicate
    assert Property.objects.count() == 6
    assert Property.objects.get(name="Bodega Apodaca").property_type == "industrial"


@pytest.mark.django_db
def test_seed_does_not_reset_changes():
    call_command("seed")
    Property.objects.filter(name="Torre Andares").update(status="leased", monthly_rent="90000")
    call_command("seed")
    torre = Property.objects.get(name="Torre Andares")
    assert (torre.status, str(torre.monthly_rent)) == ("leased", "90000.00")


@pytest.mark.django_db
def test_newest_first_breaks_ties_newest_id_first(client):
    for i in range(3):
        Property.objects.create(name=f"Edificio {i}", city="CDMX", size_m2=100)
    Property.objects.update(created_at="2026-01-01T00:00:00Z")  # same timestamp for all
    expected = list(Property.objects.order_by("-id").values_list("name", flat=True))
    assert [p["name"] for p in client.get(URL, {"ordering": "-created_at"}).data["results"]] == expected
    assert [p["name"] for p in client.get(URL).data["results"]] == expected  # same as the default list


@pytest.mark.django_db
def test_import_rejects_a_header_with_missing_columns(tmp_path):
    csv_file = tmp_path / "edificios.csv"
    csv_file.write_text(HEADER.replace("precio", "precio_mxn") + '"A",Oficina,Renta,"x","CDMX",01000,1,2,"$1"\n',
                        encoding="utf-8")
    with pytest.raises(CommandError, match="The header is missing the columns: precio"):
        call_command("import_properties", str(csv_file))


@pytest.mark.django_db
@pytest.mark.parametrize("row,message", [
    ('"SHORT",Oficina,Renta,"Calle 1","CDMX",01000', "is missing values for superficie_min_m2, superficie_max_m2, precio"),
    ('"LONG",Oficina,Renta,Calle 1, Col. Centro,"CDMX",01000,100,200,"A consultar (USD)"', "has more than 9 values"),
])
def test_import_rejects_rows_with_the_wrong_number_of_values(import_csv, row, message):
    with pytest.raises(CommandError, match=re.escape(message)):
        import_csv(row)
    assert Property.objects.count() == 0


@pytest.mark.django_db
def test_import_rejects_the_same_name_twice_in_one_file(import_csv):
    with pytest.raises(CommandError, match=r"Line 3 \('TORRE A'\): same name as line 2"):
        import_csv('"TORRE A",Oficina,Renta,"Calle 1","CDMX",01000,100,200,"A consultar (USD)"',
                   '"TORRE A",Oficina,Renta,"Calle 9","Monterrey",64000,50,60,"A consultar (USD)"')
    assert Property.objects.count() == 0


@pytest.mark.django_db(transaction=True)
def test_migration_0003_renames_duplicate_names_before_making_them_unique():
    from django.db import connection
    from django.db.migrations.executor import MigrationExecutor

    before = [("properties", "0002_property_address_property_operation_and_more")]
    after = [("properties", "0003_unique_property_name")]
    executor = MigrationExecutor(connection)
    executor.migrate(before)
    OldProperty = executor.loader.project_state(before).apps.get_model("properties", "Property")
    for name in ["Oficina Centro", "Oficina Centro", "Oficina Centro", "Oficina Centro (2)"]:
        OldProperty.objects.create(name=name, city="CDMX", size_m2=100)

    executor = MigrationExecutor(connection)  # reload the graph after migrating back
    executor.migrate(after)

    names = list(Property.objects.order_by("id").values_list("name", flat=True))
    # The oldest keeps the name; "(2)" was already taken, so the copies become (3) and (4)
    assert names == ["Oficina Centro", "Oficina Centro (3)", "Oficina Centro (4)", "Oficina Centro (2)"]
