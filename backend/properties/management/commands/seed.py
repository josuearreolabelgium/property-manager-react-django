from django.core.management.base import BaseCommand

from properties.models import Property

DATA = [
    ("Torre Andares", "Guadalajara", 500, "85000", "available"),
    ("Oficina Chapultepec", "Guadalajara", 180, "32000", "leased"),
    ("Corporativo Reforma", "CDMX", 1200, "260000", "available"),
    ("Bodega Apodaca", "Monterrey", 3000, "150000", "available"),
    ("Coworking Valle", "Monterrey", 90, "18000", "leased"),
]


class Command(BaseCommand):
    help = "Load sample properties"

    def handle(self, *args, **options):
        Property.objects.all().delete()
        for name, city, size, rent, status in DATA:
            Property.objects.create(name=name, city=city, size_m2=size, monthly_rent=rent, status=status)
        self.stdout.write(self.style.SUCCESS(f"Loaded {len(DATA)} properties"))
