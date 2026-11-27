# Filtering by exact field values, e.g. ?city=...
from django_filters.rest_framework import DjangoFilterBackend
# DRF's viewsets bundle the list/retrieve/update/delete actions into one class
from rest_framework import viewsets
# @action adds extra endpoints to a viewset; Response returns JSON
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

# The Property model this API exposes
from .models import Property
# Converts Property objects to/from JSON and validates incoming data
from .serializers import PropertySerializer


# Sorting by size or name leaves ties (e.g. several 250 m² buildings) in no fixed order, so
# page 1 and page 2 could repeat or skip a building. Adding the id as a last sort key fixes that.
class StableOrderingFilter(OrderingFilter):
    def get_ordering(self, request, queryset, view):
        ordering = super().get_ordering(request, queryset, view)
        if ordering and not any(field.lstrip("-") == "id" for field in ordering):
            # Same direction as the main sort, so "newest first" also puts the newest of tied rows first
            ordering = [*ordering, "-id" if ordering[0].startswith("-") else "id"]
        return ordering


# ModelViewSet provides the CRUD endpoints automatically.
# Properties are created with POST or loaded from CSV files (manage.py import_properties).
# PATCH changes some fields (e.g. the status) and DELETE removes one; PUT is switched off.
class PropertyViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    # The records the endpoints work on: every property, newest first (id breaks ties)
    queryset = Property.objects.all().order_by("-created_at", "-id")
    # The serializer used to render responses and validate request bodies
    serializer_class = PropertySerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, StableOrderingFilter]
    # Enables filtering by exact match, e.g. /properties/?city=Madrid&status=available
    filterset_fields = ["city", "status", "property_type", "operation"]
    # Enables text search (case-insensitive, partial match), e.g. /properties/?search=torre
    search_fields = ["name", "city", "address", "postal_code"]
    # Fields the client may sort by, e.g. /properties/?ordering=-size_m2 (largest first)
    ordering_fields = ["created_at", "size_m2", "name"]

    # Extra endpoint GET /api/properties/cities/ (detail=False = not tied to one property)
    @action(detail=False)
    def cities(self, request):
        # Every distinct city in the database, alphabetical, e.g. ["CDMX", "Guadalajara"]
        cities = Property.objects.order_by("city").values_list("city", flat=True).distinct()
        return Response(list(cities))
