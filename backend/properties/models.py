from django.db import models


class Property(models.Model):
    STATUS_CHOICES = [("available", "Available"), ("leased", "Leased")]

    name = models.CharField(max_length=120)
    city = models.CharField(max_length=80)
    size_m2 = models.PositiveIntegerField()
    monthly_rent = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="available")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.city})"
