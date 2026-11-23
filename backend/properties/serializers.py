from rest_framework import serializers

from .models import Property

# EXERCISE 1: the serializer
# A serializer converts Property objects to JSON (for GET) and validates
# incoming JSON before saving it (for POST / PATCH).
#
# TODO 1.1: create a class PropertySerializer that inherits from serializers.ModelSerializer
#
# TODO 1.2: inside it, add a "class Meta" with:
#   model = Property
#   fields = a list with: id, name, city, size_m2, monthly_rent, status, created_at
#   read_only_fields = id and created_at (the client should never send these)
#
# TODO 1.3: add a method validate_size_m2(self, value)
#   if value <= 0, raise serializers.ValidationError("Size must be greater than 0.")
#   otherwise return value
#   (DRF calls validate_<field name> automatically for each field)
#
# Test that checks this: test_create_invalid_size_returns_400
# Docs: https://www.django-rest-framework.org/api-guide/serializers/#modelserializer
class PropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = ["id", "name", "city", "size_m2", "monthly_rent", "status", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_size_m2(self, value):
        if value <= 0: 
            raise serializers.ValidationError("Size must be greater than 0.")
        return value