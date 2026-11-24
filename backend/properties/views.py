# DRF's viewsets bundle the list/create/retrieve/update/delete actions into one class
from rest_framework import viewsets

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
