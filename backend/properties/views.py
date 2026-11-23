from rest_framework import viewsets

from .models import Property
from .serializers import PropertySerializer

# EXERCISE 2: the view
# One ModelViewSet gives you list, create, retrieve, update and delete for free.
#
# TODO 2.1: create a class PropertyViewSet that inherits from viewsets.ModelViewSet
#
# TODO 2.2: set these class attributes:
#   queryset         = all properties, newest first (hint: .order_by("-created_at"))
#   serializer_class = the serializer from exercise 1
#
# TODO 2.3: allow filtering with ?city=...&status=...
#   filterset_fields = a list with the two field names
#   (django-filter is already configured in core/settings.py)
#
# Tests that check this: all of them, especially test_filter_by_city
# Docs: https://www.django-rest-framework.org/api-guide/viewsets/#modelviewset
class PropertyViewSet(viewsets.ModelViewSet):
    queryset = Property.objects.all().order_by("-created_at")
    serializer_class = PropertySerializer
    filterset_fields = ["city","status"]