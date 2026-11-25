# DRF's viewsets bundle the list/create/retrieve/update/delete actions into one class
from rest_framework import viewsets
# @action adds extra endpoints to a viewset; Response returns JSON
from rest_framework.decorators import action
from rest_framework.response import Response

# The Property model this API exposes
from .models import Property
# Converts Property objects to/from JSON and validates incoming data
from .serializers import PropertySerializer


# ModelViewSet provides all CRUD endpoints (GET, POST, PUT, PATCH, DELETE) automatically
class PropertyViewSet(viewsets.ModelViewSet):
    # The records the endpoints work on: every property, newest first
    queryset = Property.objects.all().order_by("-created_at")
    # The serializer used to render responses and validate request bodies
    serializer_class = PropertySerializer
    # Enables filtering by exact match, e.g. /properties/?city=Madrid&status=available
    filterset_fields = ["city", "status"]

    # Extra endpoint GET /api/properties/cities/ (detail=False = not tied to one property)
    @action(detail=False)
    def cities(self, request):
        # Every distinct city in the database, alphabetical, e.g. ["CDMX", "Guadalajara"]
        cities = Property.objects.order_by("city").values_list("city", flat=True).distinct()
        return Response(list(cities))
