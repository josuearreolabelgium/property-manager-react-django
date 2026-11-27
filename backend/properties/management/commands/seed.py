from django.core.management.base import BaseCommand

from properties.models import Property

# name, type, city, size m², monthly rent (MXN), status
DATA = [
    ("Torre Andares", "office", "Guadalajara", 500, "85000", "available"),
    ("Oficina Chapultepec", "office", "Guadalajara", 180, "32000", "leased"),
    ("Corporativo Reforma", "office", "CDMX", 1200, "260000", "available"),
    ("Bodega Apodaca", "industrial", "Monterrey", 3000, "150000", "available"),
    ("Coworking Valle", "office", "Monterrey", 90, "18000", "leased"),
]


class Command(BaseCommand):
    help = "Add sample properties that do not exist yet (existing ones, and any changes made to them, are kept)"

    def handle(self, *args, **options):
        added = 0
        for name, property_type, city, size, rent, status in DATA:
            added += Property.objects.get_or_create(name=name, defaults={
                "property_type": property_type, "city": city, "size_m2": size,
                "monthly_rent": rent, "rent_currency": "MXN", "status": status,
            })[1]
        self.stdout.write(self.style.SUCCESS(f"Added {added} sample properties"))
