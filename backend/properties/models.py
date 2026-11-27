from django.db import models


class Property(models.Model):
    STATUS_CHOICES = [("available", "Available"), ("leased", "Leased")]
    TYPE_CHOICES = [("office", "Office"), ("industrial", "Industrial"), ("retail", "Retail"), ("land", "Land")]
    OPERATION_CHOICES = [("rent", "Rent"), ("sale", "Sale")]
    CURRENCY_CHOICES = [("MXN", "MXN"), ("USD", "USD"), ("EUR", "EUR")]

    # Unique: the CSV import uses the name to find a building it already loaded
    name = models.CharField(max_length=120, unique=True)
    property_type = models.CharField(max_length=12, choices=TYPE_CHOICES, default="office")
    operation = models.CharField(max_length=4, choices=OPERATION_CHOICES, default="rent")
    address = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=80)
    # Text, not a number, so leading zeros are kept (e.g. 01020)
    postal_code = models.CharField(max_length=10, blank=True)
    # Smallest available surface; size_max_m2 is only set when the space can be leased in a range
    size_m2 = models.PositiveIntegerField()
    size_max_m2 = models.PositiveIntegerField(null=True, blank=True)
    # Empty means "price on request" ("A consultar")
    monthly_rent = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    rent_currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default="MXN")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="available")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.city})"
