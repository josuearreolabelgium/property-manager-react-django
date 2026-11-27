from rest_framework import serializers

from .models import Property

# Converts Property objects to JSON (GET) and validates incoming JSON before saving it (POST / PATCH)
class PropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = [
            "id", "name", "property_type", "operation", "address", "city", "postal_code",
            "size_m2", "size_max_m2", "monthly_rent", "rent_currency", "status", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_size_m2(self, value):
        if value <= 0: 
            raise serializers.ValidationError("Size must be greater than 0.")
        return value

    def validate(self, attrs):
        # On PATCH only some fields are sent, so fall back to the saved values
        size = attrs.get("size_m2", getattr(self.instance, "size_m2", None))
        size_max = attrs.get("size_max_m2", getattr(self.instance, "size_max_m2", None))
        if size_max is not None and size is not None and size_max < size:
            # Report it on the field the client sent, so the error can be shown next to it
            field = "size_max_m2" if "size_max_m2" in attrs else "size_m2"
            raise serializers.ValidationError({field: "Maximum size cannot be smaller than the minimum size."})
        return attrs
