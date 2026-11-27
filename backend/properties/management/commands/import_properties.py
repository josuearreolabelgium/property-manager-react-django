import csv
import re
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from properties.models import Property
from properties.serializers import PropertySerializer

# Spanish values used in the CSV -> values stored in the database
TYPES = {"oficina": "office", "industrial": "industrial", "nave industrial": "industrial",
         "local": "retail", "local comercial": "retail", "comercial": "retail", "terreno": "land"}
# "Venta/Renta" buildings can also be leased, so they are imported as rentals
OPERATIONS = {"renta": "rent", "venta": "sale", "venta/renta": "rent", "renta/venta": "rent"}
# The whole price must be one amount, e.g. "$85,000 MXN", "85000.50 USD" or "$32,000"
PRICE = re.compile(r"^\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(MXN|USD|EUR)?$", re.IGNORECASE)
# "A consultar (USD)" = price on request, quoted in USD
ON_REQUEST = re.compile(r"^a consultar(?:\s*\((MXN|USD|EUR)\))?$", re.IGNORECASE)


class RowError(ValueError):
    """A value in the CSV that cannot be imported; the message is shown to the user."""


COLUMNS = ["nombre", "tipo", "operacion", "direccion", "ciudad", "codigo_postal",
           "superficie_min_m2", "superficie_max_m2", "precio"]


def parse_size(text):
    """Whole square metres; decimals like '301.5' are rounded half up (-> 302)."""
    try:
        size = Decimal(text.strip())
        if not size.is_finite():  # "NaN" and "Infinity" are valid Decimals but not sizes
            raise InvalidOperation
        return int(size.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    except (InvalidOperation, ValueError):
        raise RowError(f"size {text!r} is not a number")


def parse_price(text):
    """'A consultar (USD)' -> (None, 'USD');  '$85,000 MXN' -> (Decimal('85000'), 'MXN').

    Anything else, such as '$25 USD/m2' or '$100-$200 USD', is rejected instead of guessed."""
    text = text.strip()
    if match := ON_REQUEST.match(text):
        return None, (match[1] or "MXN").upper()
    if match := PRICE.match(text):
        return Decimal(match[1].replace(",", "")), (match[2] or "MXN").upper()
    raise RowError(f"price {text!r} must be 'A consultar (CUR)' or a single amount such as '$85,000 MXN'")


def lookup(table, column, value):
    try:
        return table[value.strip().lower()]
    except KeyError:
        raise RowError(f"unknown {column} {value.strip()!r}")


def row_to_data(row):
    """Turns one CSV row into the fields the serializer expects."""
    # csv.DictReader puts None in the columns a short row is missing, and extra values under the key None
    if None in row:
        raise RowError(f"has more than {len(COLUMNS)} values (check for unquoted commas)")
    missing = [c for c in COLUMNS if row[c] is None]
    if missing:
        raise RowError(f"is missing values for {', '.join(missing)}")
    size_min = parse_size(row["superficie_min_m2"])
    size_max = parse_size(row["superficie_max_m2"]) if row["superficie_max_m2"].strip() else None
    rent, currency = parse_price(row["precio"])
    return {
        "name": row["nombre"].strip(),
        "property_type": lookup(TYPES, "tipo", row["tipo"]),
        "operation": lookup(OPERATIONS, "operacion", row["operacion"]),
        "address": row["direccion"].strip(),
        "city": row["ciudad"].strip(),
        "postal_code": row["codigo_postal"].strip(),
        "size_m2": size_min,
        # A range like 3112-3112 is really a single size
        "size_max_m2": size_max if size_max and size_max != size_min else None,
        "monthly_rent": rent,
        "rent_currency": currency,
    }


class Command(BaseCommand):
    help = "Import or update properties from a CSV file (columns: nombre, tipo, operacion, direccion, ciudad, " \
           "codigo_postal, superficie_min_m2, superficie_max_m2, precio)"

    def add_arguments(self, parser):
        parser.add_argument("csv_path")

    @transaction.atomic  # all rows are saved, or none if one fails
    def handle(self, csv_path, **options):
        created = updated = 0
        seen = {}  # name -> line, to catch the same building twice in one file
        # utf-8-sig also accepts files saved by Excel, which start with a BOM
        with open(csv_path, encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            missing = [c for c in COLUMNS if c not in (reader.fieldnames or [])]
            if missing:
                raise CommandError(f"The header is missing the columns: {', '.join(missing)} "
                                   f"(expected: {','.join(COLUMNS)})")
            for row in reader:
                line = reader.line_num  # the real file line, even if a quoted value spans several lines
                try:
                    data = row_to_data(row)
                except RowError as e:
                    raise CommandError(f"Line {line} ({row['nombre']!r}): {e}")
                if data["name"] in seen:
                    raise CommandError(f"Line {line} ({row['nombre']!r}): same name as line {seen[data['name']]}; "
                                       "each building needs a unique name")
                seen[data["name"]] = line
                # The name is unique, so importing the same file twice updates instead of duplicating
                existing = Property.objects.filter(name=data["name"]).first()
                # The serializer applies the same checks as the API (size > 0, max >= min, valid choices...)
                serializer = PropertySerializer(existing, data=data)
                if not serializer.is_valid():
                    raise CommandError(f"Line {line} ({row['nombre']!r}): {dict(serializer.errors)}")
                serializer.save()
                created += existing is None
                updated += existing is not None
        self.stdout.write(self.style.SUCCESS(f"Imported {created} new and updated {updated} properties"))
